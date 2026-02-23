# Binary Mosaic decode game

Binary Mosaic is a static, browser-only classroom decode game for teaching binary image representation.

## Files
- `index.html` – decode game UI.
- `styles.css` – dark theme layout, centered large canvas, legend swatches.
- `app.js` – decode gameplay logic, level progression, total-run timer, validation.
- `puzzles.js` – built-in puzzle definitions.

## Teacher quick start
1. Open `index.html` in any modern browser.
2. Read the built-in tutorial and click **Start levels**.
3. Students decode using the side legend (`bits -> colour`) and paint the large central grid (paint mode on every level).
4. First 5 levels include prefilled hint cells; each level gives fewer hints.
5. Last 3 levels are fully blank (no hints).
6. Click **Check** to validate; a successful level auto-advances.
7. Timer shows total run time across all levels.

## Challenge design
- 8 total levels, escalating in difficulty.
- 4-colour (2-bit) palette for every level.
- Success feedback includes a short green flash around the grid.

## Customisation guide for teachers
In `app.js`, tweak:
- Paint colours in `DEFAULT_PALETTES`.
- Score formula in `checkChallenge()`.
- Hint distribution in `pickPrefilledIndices()`.

In `puzzles.js`, add/edit puzzle objects:
- `size`, `bitDepth`, `prefillCount`, `cells`.

## GitHub Pages deployment
1. Push to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Branch: `main`, folder: `/ (root)`.
5. Save and open the Pages URL.

No accounts, tracking, or server are required.
