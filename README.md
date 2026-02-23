# Binary Mosaic web game

Binary Mosaic is a static, browser-only classroom game for teaching binary image representation. Pupils can create pixel art with 2 colours (1 bit) or 4 colours (2 bits), generate an encoding legend + bitstream, and challenge classmates to decode and rebuild it.

## Files
- `index.html` – app structure and UI.
- `styles.css` – layout, responsive styles, high contrast mode, legend swatches.
- `app.js` – game logic, encode/decode, validation, scoring, accessibility controls.
- `puzzles.js` – built-in puzzle definitions.

## Teacher quick start
1. Open `index.html` in any modern browser.
2. In **Create/Encode**:
   - Choose grid size: 8x8, 12x12, 16x16.
   - Choose 1-bit or 2-bit palette.
   - Paint with mouse/touch or keyboard (arrows + space/enter).
   - Generate legend + bitstream.
   - Legend is shown with coloured swatches (not hex colour codes).
3. In **Decode/Challenge**:
   - Paste a legend and bitstream.
   - Legend format is `binary=value`, e.g. `0=0`, `1=1` for 1-bit, or `00=0`, `01=1`, `10=2`, `11=3` for 2-bit.
   - Use the built-in **Decode Challenge Tutorial** panel for step-by-step pupil instructions.
   - Use **Render from bits** to decode directly.
   - Use **Rebuild challenge** so pupils reconstruct on an empty grid and click **Check**.

## Classroom tips
- Use 8x8 1-bit for beginners.
- Introduce row-major reading before using 12x12 and 16x16 challenges.
- Turn on timer for extension tasks.
- Turn on colour-blind palette and high contrast mode if needed.

## Customisation guide for teachers
In `app.js`, look for commented helper sections to change:
- Grid options in the HTML dropdown.
- Colour palettes in `DEFAULT_PALETTES`.
- Bit code mapping in `bitCodes()`.
- Score formula in `checkChallenge()`.

In `puzzles.js`, add/edit puzzle objects:
- `title`, `size`, `bitDepth`, `cells`.

## Built-in puzzles
- 4 easy: 8x8, 1-bit
- 2 medium: 12x12, 2-bit
- 2 hard: 16x16, 2-bit

## Validation included
- Legend format checking (`bits=valueIndex`).
- Bitstream length checking against grid size and bit depth.
- Friendly error messages shown in the UI status areas.

## GitHub Pages deployment
1. Push to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Branch: `main`, folder: `/ (root)`.
5. Save and open the Pages URL.

No accounts, tracking, or server are required.
