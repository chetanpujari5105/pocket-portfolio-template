"use client";

import { useEffect, useRef, useState } from "react";
import { useTransform } from "motion/react";
import * as m from "motion/react-m";

import { HOME_SCALE_OPEN, useRecede } from "@/lib/motion";

import {
  useOS,
  prefersReducedMotion,
  type Wallpaper as WallpaperId,
} from "@/lib/store";

/*
 * Original animated wallpapers drawn with one small fragment shader.
 * - ribbons: glossy flowing bands in the finish colour
 * - aurora:  soft drifting light over a deep backdrop
 * - dusk:    calm vertical gradient with a slow sheen
 * Renders at reduced resolution, ~30fps, pauses when hidden, and draws a single
 * still frame under reduced motion. Falls back to CSS when WebGL is missing.
 */

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

// Ribbons add a thin rim light at each band edge, and every mode gets fine grain (no banding,
// texture for frosted glass to pick up). GLSL comments would ship in the bundle, so they live here.
const FRAG = `
precision mediump float;
uniform vec2 r;
uniform float t;
uniform vec3 a;
uniform vec3 d;
uniform int mode;
uniform float dark;

vec3 tone(vec3 c){ return c / (c + vec3(0.9)) * 1.6; }

void main(){
  vec2 q = (gl_FragCoord.xy - .5 * r) / r.y;
  float time = t * .06;
  vec3 col;

  if (mode == 0) {
    vec2 w = q * 1.15;
    for (int i = 1; i < 4; i++) {
      float fi = float(i);
      w.x += .55 / fi * sin(fi * 1.7 * w.y + time * 1.6 + fi * .7);
      w.y += .38 / fi * cos(fi * 1.3 * w.x - time * 1.2 + fi * 1.3);
    }
    float f = w.x * 4.2 + w.y * 2.6;
    float s = sin(f);
    float body = smoothstep(-.35, 1., s);
    float gloss = pow(max(0., sin(f + .75)), 28.0);
    float gap = smoothstep(-.98, -.55, s);
    vec3 base = mix(d * .12, a * .95, body * body);
    col = base * mix(.18, 1., gap) + gloss * mix(a, vec3(1.), .6) * 1.1;
    col += exp(-pow((s + .7) * 16., 2.)) * mix(a, vec3(1.), .45) * .55;
  } else if (mode == 1) {
    float n = sin(q.x * 2.2 + time * 2.0) * .5 + sin(q.y * 3.1 - time * 1.4 + q.x) * .5;
    float g1 = exp(-pow(q.y - .25 - .18 * n, 2.0) * 9.0);
    float g2 = exp(-pow(q.y + .3 + .12 * sin(q.x * 2.7 + time * 1.8), 2.0) * 7.0);
    col = d * .1 + a * g1 * .95 + mix(a, vec3(.35,.55,1.), .5) * g2 * .55;
  } else {
    float sheen = .5 + .5 * sin(q.x * 1.5 - q.y * 2.0 + time * 1.2);
    col = mix(d * .55, a, smoothstep(-.6, .7, q.y)) + sheen * .06;
  }

  col = tone(col);
  float vig = smoothstep(1.25, .35, length(q * vec2(.9, .7)));
  col *= mix(.55, 1., vig);
  col *= mix(1., .82, dark);
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - .5) * .022;
  gl_FragColor = vec4(col, 1.);
}`;

const MODES: Record<WallpaperId, number> = { ribbons: 0, aurora: 1, dusk: 2 };

function parseColor(value: string): [number, number, number] {
  const hex = value.trim().replace("#", "");
  const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return [1, 0.72, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  // No COMPILE_STATUS check here: it blocks; a bad shader fails LINK_STATUS later
  return s;
}

export function Wallpaper() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wallpaper = useOS((s) => s.wallpaper);
  const reduceMotion = useOS((s) => s.reduceMotion);
  const [failed, setFailed] = useState(false);
  // Recedes with the home screen while an app opens
  const recede = useRecede();
  const transform = useTransform(recede, (r) => (r < 0.001 ? "none" : `scale(${1 - (1 - HOME_SCALE_OPEN) * r})`));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let cleanup = () => {};

    // Wait for an idle moment after first paint so shader work never competes with hydration
    const idle =
      window.requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 300));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const idleId = idle(() => {
      const gl = canvas.getContext("webgl", {
        antialias: false,
        alpha: false,
        powerPreference: "low-power",
      });
      const vert = gl && compile(gl, gl.VERTEX_SHADER, VERT);
      const frag = gl && compile(gl, gl.FRAGMENT_SHADER, FRAG);
      const program = gl?.createProgram();
      if (!gl || !vert || !frag || !program) {
        setFailed(true);
        return;
      }
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.linkProgram(program);

      // With KHR_parallel_shader_compile, poll instead of blocking on LINK_STATUS
      const parallel = gl.getExtension("KHR_parallel_shader_compile") as {
        COMPLETION_STATUS_KHR: number;
      } | null;
      const whenLinked = (then: () => void) => {
        if (cancelled) return;
        if (
          parallel &&
          !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)
        )
          requestAnimationFrame(() => whenLinked(then));
        else then();
      };
      whenLinked(() => {
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          setFailed(true);
          return;
        }
        cleanup = start(gl, program, vert, frag);
      });
    });

    const start = (
      gl: WebGLRenderingContext,
      program: WebGLProgram,
      vert: WebGLShader,
      frag: WebGLShader,
    ) => {
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      const loc = gl.getAttribLocation(program, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const u = {
        r: gl.getUniformLocation(program, "r"),
        t: gl.getUniformLocation(program, "t"),
        a: gl.getUniformLocation(program, "a"),
        d: gl.getUniformLocation(program, "d"),
        mode: gl.getUniformLocation(program, "mode"),
        dark: gl.getUniformLocation(program, "dark"),
      };

      const readColors = () => {
        const css = getComputedStyle(document.documentElement);
        gl.uniform3f(u.a, ...parseColor(css.getPropertyValue("--accent")));
        gl.uniform3f(u.d, ...parseColor(css.getPropertyValue("--accent-deep")));
        gl.uniform1f(
          u.dark,
          document.documentElement.classList.contains("dark") ? 1 : 0,
        );
      };
      gl.uniform1i(u.mode, MODES[wallpaper]);
      readColors();

      const resize = () => {
        const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
        const w = Math.max(1, Math.round(canvas.clientWidth * scale));
        const h = Math.max(1, Math.round(canvas.clientHeight * scale));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
        gl.uniform2f(u.r, w, h);
      };

      let raf = 0;
      let last = 0;
      const start = performance.now() - 40_000;
      const still = prefersReducedMotion();
      const draw = (now: number) => {
        resize();
        gl.uniform1f(u.t, (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        canvas.dataset.ready = "";
      };
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        if (now - last < 33) return;
        last = now;
        draw(now);
      };
      const play = () => {
        cancelAnimationFrame(raf);
        if (still || document.hidden) draw(start + 52_000);
        else raf = requestAnimationFrame(loop);
      };
      play();

      const observer = new MutationObserver(() => {
        readColors();
        if (still) draw(start + 52_000);
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-finish", "class"],
      });
      document.addEventListener("visibilitychange", play);
      window.addEventListener("resize", play);

      return () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
        document.removeEventListener("visibilitychange", play);
        window.removeEventListener("resize", play);
        gl.deleteProgram(program);
        gl.deleteShader(vert);
        gl.deleteShader(frag);
        gl.deleteBuffer(buffer);
      };
    };

    return () => {
      cancelled = true;
      cancelIdle(idleId);
      cleanup();
    };
  }, [wallpaper, reduceMotion]);

  return (
    <m.div
      aria-hidden
      style={{ transform }}
      className="absolute inset-0 overflow-hidden bg-finish-deep"
    >
      {/* The CSS gradient shows until the shader's first frame, and stays if WebGL fails */}
      <div
        className="wallpaper-fallback absolute inset-0"
        data-variant={wallpaper}
      />
      {!failed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full opacity-0 transition-opacity duration-500 data-ready:opacity-100"
        />
      )}
    </m.div>
  );
}
