// Generate PWA icons from the source SVG using sharp.
// Run: node /home/z/my-project/scripts/gen-pwa-icons.mjs
import sharp from "sharp";
import fs from "fs";
import path from "path";

const ICONS_DIR = "/home/z/my-project/public/icons";
const SOURCE_SVG = path.join(ICONS_DIR, "source.svg");

const sizes = [
  { name: "pwa-192.png", size: 192 },
  { name: "pwa-512.png", size: 512 },
  { name: "maskable-192.png", size: 192, padding: 48 },
  { name: "maskable-512.png", size: 512, padding: 96 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "favicon-32.png", size: 32 },
];

const svg = fs.readFileSync(SOURCE_SVG);
const BRAND_BG = { r: 255, g: 107, b: 26, alpha: 1 };

for (const s of sizes) {
  if (s.padding) {
    // Maskable: place the logo in the center with safe-zone padding.
    const inner = await sharp(svg)
      .resize(s.size, s.size, { fit: "contain" })
      .extend({
        top: s.padding,
        bottom: s.padding,
        left: s.padding,
        right: s.padding,
        background: BRAND_BG,
      })
      .png()
      .toBuffer();
    await sharp(inner).toFile(path.join(ICONS_DIR, s.name));
  } else {
    await sharp(svg)
      .resize(s.size, s.size, { fit: "cover" })
      .png()
      .toFile(path.join(ICONS_DIR, s.name));
  }
  console.log("Generated " + s.name);
}
