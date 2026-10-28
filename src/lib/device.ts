/*
 * One original device, drawn twice: by CSS (tablet, no WebGL, reduced motion) and in 3D. Both read
 * these ratios, all as a share of the phone's height, so the live screen lines up pixel for pixel
 * when it moves between them. A large flagship: 77.5 × 163.5 × 8.8 mm.
 * globals.css repeats the numbers in `.phone-wrap` / `.phone-rim` / `.phone-bezel` / `.phone-screen`.
 */

export const DEVICE = {
  aspect: 77.5 / 163.5,
  depth: 8.8 / 163.5,
  /** Outer corner radius: 12.5% of the width */
  radius: (0.125 * 77.5) / 163.5,
  /** Polished chamfer seen from the front (the metal lip around the glass) */
  rim: 0.0045,
  /** Pure-black border around the display, even all round (≈ 1.4% of the width) */
  bezel: 0.0066,
};

/** Screen inset from the outer edge (rim + bezel) */
export const SCREEN_INSET_RATIO = DEVICE.rim + DEVICE.bezel;
