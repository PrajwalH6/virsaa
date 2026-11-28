import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const preview = process.env.TEST_CAFE_URL;
const runtime = process.env.TEST_PLAYWRIGHT_MODULE;

test("mobile menu, visible keyboard focus and unknown routes", { skip: !preview && !runtime }, async () => {
  const { chromium } = await import(runtime ? pathToFileURL(runtime).href : "playwright");
  const { createServer } = await import("vite");
  const server = preview ? null : await createServer({
    envFile: false,
    define: {
      "import.meta.env.VITE_SUPABASE_URL": '""',
      "import.meta.env.VITE_SUPABASE_ANON_KEY": '""',
    },
    server: { host: "127.0.0.1", port: 0 },
  });

  let browser;
  try {
    await server?.listen();
    const base = preview || server.resolvedUrls.local[0];
    browser = await chromium.launch({
      executablePath: process.env.TEST_CHROMIUM_EXECUTABLE || undefined,
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
    if (!preview) {
      const localOrigin = new URL(base).origin;
      await page.route("**/*", (route) =>
        new URL(route.request().url()).origin === localOrigin ? route.continue() : route.abort()
      );
    }
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const toggle = page.getByRole("button", { name: "Open navigation" });
    assert.equal(await toggle.evaluate((button) => getComputedStyle(button).outlineStyle), "none");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    assert.equal(await toggle.evaluate((button) => button.matches(":focus-visible")), true);
    assert.equal(await toggle.evaluate((button) => getComputedStyle(button).outlineStyle), "solid");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Close navigation" }).waitFor();
    await page.waitForFunction(() => document.body.style.overflow === "hidden");
    const menuLinks = page.getByRole("navigation", { name: "Main navigation" }).getByRole("link");
    await menuLinks.first().waitFor();
    assert.equal(await menuLinks.count(), 4);
    assert.equal(await menuLinks.first().evaluate((link) => link === document.activeElement), true);
    await page.keyboard.press("Escape");
    assert.equal(await toggle.evaluate((button) => button === document.activeElement), true);
    await page.waitForFunction(() => document.body.style.overflow === "");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.body.style.overflow === "hidden");
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.waitForFunction(() => document.body.style.overflow === "");
    await page.setViewportSize({ width: 390, height: 800 });
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");

    const missing = await page.goto(new URL("/missing-cafe-page", base).href, { waitUntil: "domcontentloaded" });
    if (preview) assert.equal(missing.status(), 404);
    await page.getByRole("heading", { name: "Page not found" }).waitFor();
    await page.getByRole("link", { name: "Return to Homepage" }).click();
    assert.equal(new URL(page.url()).pathname, "/");
  } finally {
    await browser?.close();
    await server?.close();
  }
});
