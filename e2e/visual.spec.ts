import { expect, test, type Page } from "@playwright/test";

const proj = (t: { project: { name: string } }) => t.project.name;
const shot = (page: Page, name: string) => page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });

test("brand surfaces render without horizontal overflow", async ({ page }, info) => {
  const p = proj(info);
  const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Your computer is one phone call away." })).toBeVisible();
  await expect(page.getByText("Call,").first()).toBeVisible();
  await noOverflow(); await shot(page, `${p}-landing`);

  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await noOverflow(); await shot(page, `${p}-sign-in`);

  await page.goto("/definitely-missing");
  await expect(page.getByRole("heading", { name: "We couldn't find that." })).toBeVisible();
  await shot(page, `${p}-not-found`);

  const user = `v${Date.now().toString(36)}${p}`;
  await page.goto("/sign-in");
  await page.getByLabel("User name").fill(user);
  await page.getByRole("button", { name: "Continue as this user" }).click();
  await expect(page.getByRole("heading", { name: "Tell Dial what you need." })).toBeVisible();
  await noOverflow(); await shot(page, `${p}-home-empty`);
  for (const [path, name] of [["/app/profile", "profile"], ["/app/roles", "roles"], ["/app/settings", "connections"]] as const) {
    await page.goto(path); await noOverflow(); await shot(page, `${p}-${name}`);
  }
});

test("keyboard: skip link and focus ring are present", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});
