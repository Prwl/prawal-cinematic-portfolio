// Intro cancellation QA: ordinary keys must never end the title sequence;
// only Skip intro, the skip link, Escape, a real wheel/trackpad scroll or a
// vertical swipe may.
//   node scripts/qa-intro.mjs [url]
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:5190/";
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
let failed = 0;

async function fresh({ touch = false } = {}) {
  const context = await browser.newContext({
    viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: touch,
    hasTouch: touch,
    deviceScaleFactor: touch ? 2 : 1
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.classList.contains("intro-running"));
  await page.waitForTimeout(700);
  return { context, page, errors };
}

const running = (page) => page.evaluate(() => document.documentElement.classList.contains("intro-running"));

function record(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed++;
}

// 1. Keys and shortcuts that must be ignored.
const ignored = [
  "Tab", "Shift+Tab", "Shift", "Meta", "Control", "Alt",
  "Meta+Shift+5", "Meta+Shift+3", "Meta+Shift+4", "Control+Meta+q", "Alt+Tab",
  "Meta+c", "Control+c", "Meta+r", "a", "Space", "Enter", "ArrowDown", "PageDown", "End", "F5"
];
// Enter and Space activate whatever has focus (the skip link is an intentional
// way out), so the ignored-key sweep runs with nothing focused.
const blur = (page) => page.evaluate(() => document.activeElement?.blur());
{
  const { context, page, errors } = await fresh();
  for (const key of ignored) {
    await blur(page);
    if (key === "F5" || key === "Meta+r") {
      // Reload shortcuts are handled by the browser, not the page; dispatch
      // the key event directly so the page's handler still sees it.
      await page.evaluate((k) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, metaKey: k === "r" })), key === "F5" ? "F5" : "r");
    } else {
      await page.keyboard.press(key);
    }
  }
  await page.keyboard.type("hello prawal");
  record("ordinary keys, modifiers and shortcuts leave the intro running", await running(page), `${ignored.length} keys + typing`);
  const focusable = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? `${el.tagName.toLowerCase()}.${el.className}` : "none";
  });
  record("Tab only reaches visible controls during the intro", /skip-link|prologue__skip|body/.test(focusable), focusable);
  // Tab through: collect the focus stops.
  const stops = new Set();
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    stops.add(await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName));
  }
  record("focus order during the intro is skip link and Skip intro only", [...stops].every((s) => /skip-link|prologue__skip|BODY/.test(s)), [...stops].join(" | "));
  record("still running after tabbing", await running(page));
  // Let it play out on its own.
  await page.waitForFunction(() => !document.documentElement.classList.contains("intro-running"), null, { timeout: 12000 });
  record("the sequence completes on its own", true);
  record("no page errors", errors.length === 0, errors.join("; "));
  await context.close();
}

// 2. Small, accidental wheel input must not skip; pinch and sideways swipes must not skip.
{
  const { context, page } = await fresh();
  await page.mouse.move(700, 450);
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 8); // 32px of resting-hand drift
  await page.waitForTimeout(600);
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 12);
  record("tiny wheel drift does not skip", await running(page));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.dispatchEvent(new WheelEvent("wheel", { deltaY: 400, ctrlKey: true })));
  record("trackpad pinch (ctrl+wheel) does not skip", await running(page));
  await page.mouse.wheel(300, 40);
  record("sideways swipe does not skip", await running(page));
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(200);
  record("an intentional wheel scroll skips", !(await running(page)));
  await context.close();
}

// 3. Escape skips; modified Escape does not.
{
  const { context, page } = await fresh();
  await page.keyboard.press("Meta+Escape");
  record("Cmd+Escape does not skip", await running(page));
  await page.keyboard.press("Escape");
  record("Escape skips", !(await running(page)));
  await context.close();
}

// 4. The Skip intro control, by keyboard, keeps focus on the page.
{
  const { context, page } = await fresh();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const onSkip = await page.evaluate(() => document.activeElement?.classList.contains("prologue__skip"));
  record("Skip intro is reachable with two Tabs", onSkip);
  await page.keyboard.press("Enter");
  record("Enter on Skip intro skips", !(await running(page)));
  const after = await page.evaluate(() => document.activeElement?.id);
  record("focus moves to the title after skipping", after === "prologue-title", after);
  await page.keyboard.press("Tab");
  const next = await page.evaluate(() => document.activeElement?.textContent?.trim());
  record("next Tab reaches the first action", /See the work/.test(next ?? ""), next);
  await context.close();
}

// 5. Skip link jumps into the page and ends the intro.
{
  const { context, page } = await fresh();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
  const state = await page.evaluate(() => ({ running: document.documentElement.classList.contains("intro-running"), y: scrollY, inert: document.querySelector("main .page").inert }));
  record("skip link ends the intro and navigates", !state.running && state.y > 300 && !state.inert, JSON.stringify(state));
  await context.close();
}

// 6. Touch: a short tap-drift does not skip; a vertical swipe does.
{
  const { context, page } = await fresh({ touch: true });
  const cdp = await context.newCDPSession(page);
  async function drag(x0, y0, x1, y1) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }
  await drag(200, 500, 204, 486);
  record("touch drift of 14px does not skip", await running(page));
  await drag(60, 500, 330, 490);
  record("horizontal touch swipe does not skip", await running(page));
  await drag(200, 600, 200, 380);
  record("vertical swipe skips", !(await running(page)));
  await context.close();
}

await browser.close();
console.log(results.join("\n"));
console.log(failed ? `\n${failed} failed` : "\nAll intro checks passed.");
process.exit(failed ? 1 : 0);
