"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";

import { profile } from "@content/profile";
import { easeOut } from "@/lib/motion";
import { goBack } from "@/lib/router";
import { prefersReducedMotion } from "@/lib/store";

import { BrandTile } from "./BrandIcon";
import { FOLDER_SOCIALS, SOCIAL_MARK } from "./social-icons";

const items = FOLDER_SOCIALS.map((id) => profile.socials.find((s) => s.id === id)!).filter(Boolean);

/** iOS-style folder: zooms out of its icon over a blurred home screen. */
export function SocialsFolder({ open, screenRef }: { open: boolean; screenRef: RefObject<HTMLDivElement | null> }) {
  const [origin, setOrigin] = useState("50% 50%");
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = prefersReducedMotion();

  useLayoutEffect(() => {
    if (!open || !screenRef.current) return;
    const screen = screenRef.current.getBoundingClientRect();
    const tile = screenRef.current.querySelector("[data-icon-tile='socials']")?.getBoundingClientRect();
    if (tile)
      setOrigin(
        `${tile.left + tile.width / 2 - screen.left}px ${tile.top + tile.height / 2 - screen.top}px`,
      );
  }, [open, screenRef]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          key="folder"
          role="dialog"
          aria-modal="true"
          aria-label="Socials"
          className="absolute inset-0 z-45 grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.22, ease: easeOut } }}
          exit={{ opacity: 0, transition: { duration: 0.16, ease: "easeOut" } }}
        >
          <button
            type="button"
            aria-label="Close folder"
            tabIndex={-1}
            onClick={goBack}
            className="absolute inset-0 bg-black/25 backdrop-blur-[18px]"
          />
          <m.div
            ref={panelRef}
            style={{ transformOrigin: origin } as CSSProperties}
            initial={reduce ? false : { transform: "scale(0.3)", opacity: 0 }}
            animate={{ transform: "scale(1)", opacity: 1, transition: { type: "spring", stiffness: 420, damping: 34 } }}
            exit={reduce ? { opacity: 0 } : { transform: "scale(0.3)", opacity: 0, transition: { duration: 0.2, ease: easeOut } }}
            className="relative w-[78%]"
          >
            <h2 className="mb-3 px-1 text-[26px] font-bold tracking-tight text-white drop-shadow">Socials</h2>
            <div className="glass-dark grid grid-cols-3 gap-x-3 gap-y-4 rounded-[34px] p-5 [--icon:min(62px,15.6cqw)]">
              {items.map((s) => {
                return (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${s.label} ${s.handle} (opens in a new tab)`}
                    className="icon-press flex flex-col items-center gap-[5px] rounded-[14px]"
                  >
                    <BrandTile mark={SOCIAL_MARK[s.id]} as="icon" />
                    <span className="icon-label max-w-full truncate">{s.label}</span>
                  </a>
                );
              })}
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
