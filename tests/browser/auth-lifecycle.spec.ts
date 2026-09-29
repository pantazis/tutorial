import { createHash, randomBytes, randomUUID, scrypt as nodeScrypt } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const initialPassword = "A-strong-browser-password-123";
const replacementPassword = "A-new-browser-password-456";

function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function passwordHash(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, 64, { N: 16_384 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
  return `scrypt$16384$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

async function account(email: string) {
  const result = await pool.query<{ id: string; preferred_language: "EL" | "EN"; role: string; verified_at: Date | null }>(
    "SELECT id, preferred_language, role, verified_at FROM accounts WHERE email = $1",
    [email],
  );
  const row = result.rows[0];
  if (!row) throw new Error(`Account ${email} was not created.`);
  return row;
}

async function replaceToken(email: string, purpose: "verification" | "password_reset", token: string) {
  const storedAccount = await account(email);
  await pool.query("DELETE FROM auth_tokens WHERE account_id = $1 AND purpose = $2", [storedAccount.id, purpose]);
  await pool.query(
    `INSERT INTO auth_tokens (id, account_id, purpose, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, statement_timestamp() + interval '1 hour')`,
    [randomUUID(), storedAccount.id, purpose, tokenHash(token)],
  );
}

async function createVerifiedAccount(email: string, role: "admin" | "master_admin") {
  await pool.query(
    `INSERT INTO accounts (id, email, password_hash, preferred_language, role, verified_at)
     VALUES ($1, $2, $3, 'EN', $4, statement_timestamp())`,
    [randomUUID(), email, await passwordHash(initialPassword), role],
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
  ).toBe(true);
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await pool.query("TRUNCATE accounts RESTART IDENTITY CASCADE");
});

test.afterAll(async () => {
  await pool.end();
});

test("keeps public access anonymous and denies protected access at mobile and desktop sizes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page).toHaveURL(/\/el$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Προχωρημένη μάθηση" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Συνεχίστε το ταξίδι σας" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Συνεχίστε το ταξίδι σας" }).click();
  await expect(page).toHaveURL(/\/el\/login$/u);
  await page.goto("/el/my-course");
  await expect(page).toHaveURL((url) => url.pathname === "/el/login" && url.searchParams.get("returnTo") === "/el/my-course");
  await expect(page.locator('input[name="returnTo"]')).toHaveValue("/el/my-course");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1, name: "Advanced learning" })).toBeFocused();
  await expectNoHorizontalOverflow(page);
});

test("completes registration, verification, login, logout, and password reset with explicit language", async ({ page }) => {
  test.slow();

  const email = `browser-${randomUUID()}@example.test`;
  const verificationToken = `verify-${randomUUID()}`;
  const resetToken = `reset-${randomUUID()}`;

  await page.goto("/en/register");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(initialPassword);
  await page.getByLabel("Preferred account language").selectOption("EL");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toBeFocused();
  await expect(page.getByRole("link", { name: "Already have an account? Log in" })).toBeVisible();
  expect(await account(email)).toMatchObject({ preferred_language: "EL", role: "user", verified_at: null });

  await replaceToken(email, "verification", verificationToken);
  await page.goto(`/en/verify?token=${encodeURIComponent(verificationToken)}`);
  await expect(page.getByRole("status")).toBeFocused();
  await expect(page.getByText("Your account is verified. You can now log in.")).toBeVisible();

  await page.getByRole("link", { name: "Continue to login" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(initialPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/el\/my-course$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Το μάθημά μου" })).toBeFocused();

  await page.getByRole("link", { name: "Αποσύνδεση" }).click();
  await page.getByRole("button", { name: "Αποσύνδεση" }).click();
  await expect(page).toHaveURL(/\/el\/login\?result=logout$/u);
  await expect(page.getByRole("status")).toBeFocused();
  const revoked = await pool.query<{ revoked: boolean }>(
    "SELECT bool_and(revoked_at IS NOT NULL) AS revoked FROM auth_sessions WHERE account_id = $1",
    [(await account(email)).id],
  );
  expect(revoked.rows[0]?.revoked).toBe(true);

  await page.goto("/el/forgot-password");
  await page.getByLabel("Διεύθυνση email").fill(email);
  await page.getByRole("button", { name: "Αίτημα επαναφοράς κωδικού" }).click();
  await expect(page.getByRole("status")).toBeFocused();
  await replaceToken(email, "password_reset", resetToken);
  await page.goto(`/el/reset-password?token=${encodeURIComponent(resetToken)}`);
  await page.getByLabel("Νέος κωδικός πρόσβασης").fill(replacementPassword);
  await page.getByRole("button", { name: "Αλλαγή κωδικού" }).click();
  await expect(page.getByRole("status")).toBeFocused();
  await page.getByRole("link", { name: "Μετάβαση στη σύνδεση" }).click();
  await expect(page).toHaveURL(/\/el\/login$/u);

  await page.getByLabel("Διεύθυνση email").fill(email);
  await page.getByLabel("Κωδικός πρόσβασης").fill(initialPassword);
  await page.getByRole("button", { name: "Σύνδεση" }).click();
  await expect(page.getByRole("alert", { name: "Ελέγξτε τα στοιχεία σύνδεσης" })).toBeFocused();
  await page.getByLabel("Διεύθυνση email").fill(email);
  await page.getByLabel("Κωδικός πρόσβασης").fill(replacementPassword);
  await page.getByRole("button", { name: "Σύνδεση" }).click();
  await expect(page).toHaveURL(/\/el\/my-course$/u);
});

test("rejects unsafe returns and resolves server roles without a role chooser", async ({ page }) => {
  await createVerifiedAccount("admin-browser@example.test", "admin");
  await createVerifiedAccount("master-browser@example.test", "master_admin");

  await page.goto("/en/login?returnTo=https%3A%2F%2Fattacker.example%2Fen%2Fmy-course");
  await expect(page.locator('input[name="returnTo"]')).toHaveCount(0);
  await page.getByLabel("Email address").fill("admin-browser@example.test");
  await page.getByLabel("Password").fill(initialPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/admin$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Administration" })).toBeFocused();
  await expect(page.getByText(/choose.*role|role.*choose/iu)).toHaveCount(0);

  await page.context().clearCookies();
  await page.goto("/en/login?returnTo=%2Fen%2Fmy-course");
  await page.getByLabel("Email address").fill("master-browser@example.test");
  await page.getByLabel("Password").fill(initialPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/en\/my-course$/u);
});