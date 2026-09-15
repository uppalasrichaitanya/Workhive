import { expect, test } from "@playwright/test";

test("populated desktop and 320px mobile layouts", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByText("Staff Product Engineer").first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath("populated-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.reload();
  await expect(page.getByRole("button", { name: "More filters" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("populated-mobile-320.png"), fullPage: true });
});

test("loading, empty, saved-empty, and error states", async ({ page }, testInfo) => {
  await page.route("**/api/jobs?**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await route.continue();
  });
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.locator(".skeleton").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("loading.png"), fullPage: true });
  await expect(page.getByText("Staff Product Engineer").first()).toBeVisible({ timeout: 15000 });
  await page.getByRole("textbox", { name: /Search by title/ }).fill("no-such-role-492");
  await expect(page.getByText("No roles match these filters")).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath("empty.png"), fullPage: true });
  await page.getByRole("button", { name: /Saved/ }).click();
  await expect(page.getByText("No saved roles yet")).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath("saved-empty.png"), fullPage: true });

  await page.unroute("**/api/jobs?**");
  await page.route("**/api/jobs?**", (route) => route.abort());
  await page.getByRole("button", { name: "Browse all roles" }).click();
  await expect(page.getByText(/could not load the latest roles/i)).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: testInfo.outputPath("error.png"), fullPage: true });
});
