# SpriteAlign — Professional 2D Sprite Sheet Slicer & Frame Aligner

**SpriteAlign** is a lightning-fast web tool built for 2D game developers, pixel artists, and animators. It solves one of the most frustrating parts of 2D game development: slicing messy sprite sheets and fixing misaligned animation frames so characters and objects don't jitter when played back in engines like Unity, Godot, Phaser, or GameMaker.

---

## 🚀 Why SpriteAlign?

When working with sprite sheets, frames are rarely generated in perfect grids. Background padding, slight character shifts, or multi-row character animations often result in bouncy, jittery animations. SpriteAlign gives you absolute pixel-level control to slice, align, offset, and preview your 2D animations in real time right in your browser—no heavy desktop software required.

---

## ✨ Key Features

### 1. Dual Slicing Modes
* **Equal Grid Slicing:** Automatically divides any sprite sheet into even columns and rows with one click.
* **Flexible Manual Slicing:** Break free from rigid grids. Customize horizontal row dividers and **independent per-row vertical cut lines**. If your bottom row frames are slightly shifted left or right compared to the top row, you can adjust each row's vertical cuts completely independently.

### 2. Precision Frame Alignment & Onion Skinning
* **Ghosting / Onion Skinning:** Overlay previous frames with adjustable opacity to ensure smooth foot placement, weapon swings, and idle breathing loops.
* **Grid & Baseline Guides:** Toggle ground baselines, center crosshairs, and pixel grids to maintain consistent visual balance.
* **Canvas Sizing Control:** Choose between **Uniform Canvas** (standardizes all frames to the largest cell size for stable game engine imports) or **Exact Sliced Dimensions**.

### 3. Real-Time Animation Preview Theater
* **Live FPS Scrubbing:** Test animations instantly from 1 to 60 FPS with loop controls.
* **Maximized Theater Mode:** Inspect your animation in full screen with stability guides to catch any sub-pixel jitter before exporting.

### 4. Zero-Loss Export & Project Management
* **Individual PNG Export:** Download individual frames or batch export a clean zip/folder of aligned frames.
* **Aligned Sprite Sheet Export:** Export a newly composited, perfectly aligned sprite sheet ready for game engines.
* **Project Save/Load:** Save your slicing and offset configuration as a `.json` project file so you can resume editing anytime.

---

## 🛠️ Tech Stack

* **React 18** + **TypeScript**
* **Vite** (Lightning-fast builds and hot module replacement)
* **Tailwind CSS** (Modern, dark-themed UI designed for artists and developers)
* **HTML5 Canvas API** (High-performance image processing and pixel manipulation)

---

## 📦 Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/sprite-align.git
   cd sprite-align
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` in your browser.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
