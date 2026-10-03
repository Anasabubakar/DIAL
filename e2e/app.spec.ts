import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const user = `u${Date.now().toString(36)}`;
const shot = (page: Page, name: string) => page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });

async function login(page: Page, name = user) {
  await page.goto("/sign-in");
  await page.getByLabel("User name").fill(name);
  await page.getByRole("button", { name: "Continue as this user" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

test.describe.serial("applicant journey (simulated providers)", () => {
  test("signs in and sees the empty workspace", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/sign-in/); // protected
    await page.getByLabel("User name").fill(user);
    await page.getByRole("button", { name: "Continue as this user" }).click();
    await expect(page.getByRole("heading", { name: "Tell Dial what you need." })).toBeVisible();
    await expect(page.getByText("Nothing yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Prepare application/ })).toBeDisabled();
    await shot(page, "01-overview-empty");
  });

  test("builds and confirms a profile, uploads a CV", async ({ page }) => {
    await login(page);
    await page.goto("/app/profile");
    await page.getByLabel("Full name", { exact: true }).fill("Ada Obi");
    await page.getByLabel("Your email").fill("ada@example.com");
    await page.getByLabel("Headline", { exact: true }).fill("Frontend engineer");
    await page.getByLabel("Summary", { exact: true }).fill("I build fast, accessible web apps.");
    await page.getByRole("button", { name: "Add an entry" }).click();
    await page.getByLabel("Title", { exact: true }).fill("Frontend Engineer");
    await page.getByLabel("Organisation", { exact: true }).fill("Acme");
    await page.getByLabel("Start", { exact: true }).fill("2022");
    await page.getByLabel("End", { exact: true }).fill("2025");
    await page.getByLabel("Highlights (one per line)").fill("Built a React design system\nMigrated the dashboard to Next.js");
    await page.getByLabel(/I've read this and it's accurate/).check();
    await page.getByRole("button", { name: "Save and confirm" }).click();
    await expect(page.getByText("Confirmed. Dial can use your profile now.")).toBeVisible();
    await page.locator('input[type=file]').setInputFiles(path.join(__dirname, "fixtures/original-cv.pdf"));
    await page.getByRole("button", { name: "Upload" }).click();
    await expect(page.getByText("original-cv.pdf")).toBeVisible();
    await shot(page, "02-profile");
  });

  test("saves a role", async ({ page }) => {
    await login(page);
    await page.goto("/app/roles");
    await page.getByLabel("Job title", { exact: true }).fill("Frontend Engineer");
    await page.getByLabel("Company", { exact: true }).fill("Paystack");
    await page.getByLabel("Application email", { exact: true }).fill("jobs@paystack.test");
    await page.getByLabel("Job description", { exact: true }).fill("We need a frontend engineer with React and TypeScript to build our merchant dashboard.");
    await page.getByRole("button", { name: "Save role" }).click();
    await expect(page.getByText("jobs@paystack.test").first()).toBeVisible();
    await shot(page, "03-roles");
  });

  test("prepares, reviews, revises, approves and sends", async ({ page }) => {
    await login(page);
    await page.goto("/app/roles");
    await page.getByRole("button", { name: /Prepare application/ }).click();
    await expect(page).toHaveURL(/\/app\/tasks\//);
    await expect(page.getByText("Ready for review").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("jobs@paystack.test").first()).toBeVisible();
    await shot(page, "04-task-ready");

    // PDF tab renders the exact attachment
    await page.getByRole("tab", { name: /PDF/ }).click();
    await expect(page.locator("iframe[title='CV preview']")).toBeVisible();
    await page.getByRole("tab", { name: "What changed" }).click();
    await expect(page.getByText(/Highlighted/)).toBeVisible();

    // Revise -> new version, earlier approval impossible
    await page.getByRole("button", { name: "Change something" }).click();
    await page.getByLabel("What should be different?").fill("Make it a bit warmer");
    await page.getByRole("button", { name: "Make the change" }).click();
    await expect(page.getByText("Draft 2 is ready for review.")).toBeVisible({ timeout: 30_000 });

    // Switch to the original CV
    await page.getByRole("button", { name: "Change something" }).click();
    await page.getByLabel("Send my original CV instead").check();
    await page.getByRole("button", { name: "Make the change" }).click();
    await expect(page.getByText("Draft 3 is ready for review.")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("tab", { name: "Email" }).click();
    await expect(page.getByRole("tabpanel").getByText("(your original CV)")).toBeVisible();

    // Review and approve
    await page.getByRole("button", { name: /Review and approve/ }).click();
    await expect(page.getByRole("dialog").getByText("jobs@paystack.test")).toBeVisible();
    await shot(page, "05-review-dialog");
    await page.getByRole("button", { name: "Yes, send it" }).click();
    await expect(page.getByText("Email submitted").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Accepted by email service")).toBeVisible();
    await expect(page.getByText(/Test setup: no inbox received this/)).toBeVisible();
    await expect(page.getByText("Version 3 approved")).toBeVisible();
    await shot(page, "06-task-sent");
  });

  test("another user cannot open that application", async ({ page, context }) => {
    await login(page);
    const href = await page.getByRole("link", { name: /Frontend Engineer/ }).first().getAttribute("href");
    await context.clearCookies();
    await login(page, `${user}-other`);
    await page.goto(href!);
    await expect(page.getByRole("heading", { name: "We couldn't find that." })).toBeVisible();
    await expect(page.getByText("Paystack")).toHaveCount(0);
    await expect(page.getByText("jobs@paystack.test")).toHaveCount(0);
  });
});
