// Renders public/og-image.jpg from the settled opening at 1200x630.
//   node scripts/og-image.mjs [url]   (dev or preview server must be running)
import { chromium } from "playwright";
import sharp from "sharp";
import path from "node:path";

const base = process.argv[2] || "http://localhost:5190/";
const out = path.resolve(import.meta.dirname, "..", "public", "og-image.jpg");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
await page.goto(base, { waitUntil: "networkidle" });
await page.addStyleTag({ content: ".site-header, .cue-rail, .prologue__actions, .prologue__standfirst { display: none !important; }" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
const png = await page.screenshot();
await browser.close();
await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile(out);
console.log(`wrote ${out}`);
