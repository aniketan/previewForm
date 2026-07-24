import { expect, test } from "@playwright/test";

test("opens the review and supports keyboard cancellation", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByRole("button", { name: /review before sending/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Review your answers")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.getByRole("button", { name: /review before sending/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
