Work on a new branch, feat/v4-polish. Work autonomously; don't ask me questions. Anything that
needs me goes on the "Needs me" list in docs/progress.md. Use Context7 for R3F/drei/three/motion
docs, my design skills (emil-design-eng, animate, apple-design, impeccable,
web-design-guidelines), and Playwright to compare against {{REFERENCE_SITE_URL}} (behaviour only).

Problem 1 (most important): the phone must never move when I click it.
First reproduce it: a Playwright test that clicks, double-clicks and jitters (1-5px) on the
screen, the frame and the stage beside the phone, clicks an app icon and clicks fast, and
asserts the rotation stays 0 and the phone's box doesn't move (0.5px tolerance). Then fix it:
- Rotate only on a deliberate drag that starts on the stage outside the screen (never on
  anything pressable), moves more than 12px, and moves more sideways than up/down.
- Rotation follows the pointer 1:1. On release, project the velocity a little (at most 90
  degrees), then settle on the nearest face (0 or 180) with a critically damped spring (no
  overshoot, about 450ms), and stay there. No idle return, no tap-to-flip, no idle float.
  Put an explicit "Flip" button in a studio corner.
- Pitch during a drag at most 12 degrees, back to 0 on release.
- Parallax at most 3 degrees, eased slowly, and off while the pointer is over the screen, while
  any app is open, and for 600ms after any click.
- Regression tests: 200px drag ends at 180, drag again ends at 0, a 30px drag settles at 0.

Problem 2: make the phone look like a premium current large-screen flagship (front first).
- Proportions about 77.5 x 163.5 x 8.8 mm, corner radius about 12.5% of the width; thin, even,
  pure-black bezels (about 1.4% of the width) with concentric display corners; a pill cutout
  about 30% of the screen width and 3.6% of its height.
- Flat sides with a thin polished chamfer, brushed metal walls, a crisp edge highlight from
  Lightformer placement; slim, precisely placed side buttons; a faint glass sheen on the screen.
- A device-like status bar: time on the left, indicators on the right, aligned beside the pill.
- Finishes that look like anodized metal, not plastic: lower saturation, higher metalness.
- Back: an original wide camera plateau with three lenses, flash and sensor, my
  {{YOUR_INITIALS}} mark in the centre, no brand logos.
- Keep modelling it yourself in code. Don't download any phone model.
Check screenshots at 1440x900, front and back, all 3 finishes, both themes, and keep iterating
until it looks premium.

Problem 3: official brand marks for social links, polished original icons for my apps.
- Every brand link (LinkedIn, X, YouTube, Instagram, GitHub, my newsletter and course
  platforms) shows that brand's official mark from the simple-icons npm package (CC0) on a tile
  in the brand's colour, never distorted or recoloured outside its guidelines. (If a mark isn't
  in simple-icons, use Font Awesome Free and credit it, CC BY 4.0.) Put LinkedIn and X straight
  on home page 1. These link to my profiles only.
- My own app icons stay original (don't copy any system app icons) but as polished as real
  system icons: 2-3 stop gradients, soft top highlight, subtle inner shadow, glyphs with weight
  and a slight shadow, a true superellipse mask, consistent optical sizing. Check at 60px and
  180px.

Problem 4: a GitHub contribution heatmap at the top of home page 2.
- My username is {{YOUR_GITHUB_USERNAME}}; store it in content/profile.ts as github.
- getContributions(): GraphQL contributionCalendar when GITHUB_TOKEN is set, otherwise parse the
  public https://github.com/users/<user>/contributions page; cache 6h with "use cache"; if both
  fail, an empty grid with "View on GitHub".
- A full-width widget: the last ~17 weeks as rounded squares in 5 greens that work in light and
  dark, the GitHub mark, my username and the total; today's square pulses softly; columns fade
  in the first time page 2 is in view; tapping opens my profile; an accessible label like
  "GitHub: 312 contributions in the last year". Page 2 must fit without scrolling at 390x844.

Also: compare the home screen with the reference for quality only (icon size and rhythm, label
size and shadow, widget corners, frosted dock, Search pill, wallpaper richness) and close the
gap with my own content, icons and wallpaper.

Process: Problem 1 first, then 4, 3, 2, then the polish. After each: lint, typecheck, build,
test; screenshots and video at 1440x900 and 390x844, reviewed frame by frame; commit; 2-3 lines
in docs/progress.md. Keep initial JS at most 200 KB gzipped and no long tasks. Report what
changed, screenshot paths, test results and the "Needs me" list.
