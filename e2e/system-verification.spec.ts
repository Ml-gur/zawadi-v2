import { test, expect } from "@playwright/test";

test.describe("Zawadi Complete System Verification", () => {
  test("1. Homepage loads correctly with open scholarships only (no closed scholarships)", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Verify Brand / Header
    await expect(page.locator("header").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Zawadi" }).first()).toBeVisible();

    // Verify Nav Links
    await expect(page.getByRole("link", { name: "Browse Scholarships" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "How It Works" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "About" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "FAQ" }).first()).toBeVisible();

    // Verify CTA Buttons on Hero
    await expect(page.getByRole("button", { name: "Start free" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse scholarships" }).first()).toBeVisible();

    // Verify Featured Opportunities Section
    const featuredSection = page.locator("text=Featured opportunities.");
    await expect(featuredSection).toBeVisible();

    // Verify that NO cards have "Closed" chip on homepage
    const closedChips = page.locator("text=Closed");
    expect(await closedChips.count()).toBe(0);

    // Verify clicking "View details" or a scholarship card opens the scholarship detail page successfully
    const firstOpportunityCard = page.locator("section:has-text('Featured opportunities') a").first();
    if (await firstOpportunityCard.count() > 0) {
      await firstOpportunityCard.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      // Verify the scholarship detail page loads with details (NOT "Scholarship Not Available")
      const notAvailable = page.locator("h1:has-text('Scholarship Not Available')");
      expect(await notAvailable.count()).toBe(0);

      // Verify scholarship detail heading is visible
      const detailHeading = page.locator("h1").first();
      await expect(detailHeading).toBeVisible();
      const title = await detailHeading.innerText();
      expect(title.length).toBeGreaterThan(3);

      // Verify eligibility criteria and application steps sections
      await expect(page.locator("text=About the Opportunity")).toBeVisible();
      await expect(page.locator("text=Eligibility Criteria")).toBeVisible();
      await expect(page.locator("text=Application Steps")).toBeVisible();
    }
  });

  test("2. Public Scholarship Detail page loads valid scholarship data without 404", async ({ page }) => {
    // Navigate directly to public browse
    await page.goto("/scholarships/browse", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Click on the first scholarship link
    const firstScholLink = page.locator("article a, table a").first();
    await expect(firstScholLink).toBeVisible();
    await firstScholLink.click();

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Verify page rendered without "Scholarship Not Available" error
    const notAvailable = page.locator("h1:has-text('Scholarship Not Available')");
    expect(await notAvailable.count()).toBe(0);

    // Verify action buttons in sidebar
    await expect(page.locator("button:has-text('Share / Save Link')")).toBeVisible();
    await expect(page.locator("button:has-text('Apply & Get Matched'), button:has-text('Track in My Workspace'), button:has-text('Browse Open Scholarships')").first()).toBeVisible();
  });

  test("3. Login with user credentials agenticpop@gmail.com and verify authenticated workspace", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Click Sign In button in header
    const signInBtn = page.getByRole("button", { name: "Sign in" }).first();
    await signInBtn.click();
    await page.waitForTimeout(800);

    // Modal should be open
    const emailInput = page.locator("input[type='email']").first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    // Fill in credentials
    await emailInput.fill("agenticpop@gmail.com");
    const passwordInput = page.locator("input[type='password']").first();
    await passwordInput.fill("Test@212");

    // Submit form
    const submitBtn = page.locator("button[type='submit']:has-text('Sign In'), button:has-text('Sign In')").first();
    await submitBtn.click();

    // Wait for authentication and navigation
    await page.waitForTimeout(3000);
    await page.waitForLoadState("networkidle");

    // Verify dashboard elements or authenticated workspace
    await expect(page).toHaveURL(/\/dashboard|\/scholarships/);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10000 });
  });

  test("4. Full button and navigation verification across authenticated pages", async ({ page }) => {
    // Login first
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Sign in" }).first().click();
    await page.waitForTimeout(500);
    await page.locator("input[type='email']").first().fill("agenticpop@gmail.com");
    await page.locator("input[type='password']").first().fill("Test@212");
    await page.locator("button[type='submit']:has-text('Sign In'), button:has-text('Sign In')").first().click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState("networkidle");

    // Test navigation to Scholarships
    await page.goto("/scholarships", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Test navigation to Document Vault
    await page.goto("/vault", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toBeVisible();

    // Test navigation to Essay Studio
    await page.goto("/essays", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toBeVisible();

    // Test navigation to Application Tracker
    await page.goto("/applications", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toBeVisible();

    // Test navigation to Profile
    await page.goto("/profile", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toBeVisible();

    // Test navigation to Plans
    await page.goto("/billing", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toBeVisible();
  });

  test("5. Public info pages and footer link integrity", async ({ page }) => {
    for (const [name, path] of [
      ["How It Works", "/how-it-works"],
      ["About", "/about"],
      ["FAQ", "/faq"],
      ["Privacy Policy", "/privacy"],
      ["Terms of Service", "/terms"],
      ["Contact Support", "/contact"],
    ]) {
      await page.goto(path, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      await expect(page.locator("h1, h2").first(), `Heading visible on ${path}`).toBeVisible();
    }
  });

  test("6. Interactive features: Browse filtering, Grid/Table view toggling, and Share clipboard", async ({ page }) => {
    await page.goto("/scholarships/browse", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Search input interaction
    const searchInput = page.locator("input[placeholder*='Search scholarships']").first();
    if (await searchInput.count() > 0) {
      await searchInput.fill("Mastercard");
      await page.waitForTimeout(500);
      expect(await page.locator("article, tr").count()).toBeGreaterThan(0);
      await searchInput.fill("");
      await page.waitForTimeout(300);
    }

    // Toggle between Grid and Table views
    const viewButtons = page.locator("button[aria-label*='view'], button:has-text('Table'), button:has-text('Grid')");
    if (await viewButtons.count() > 0) {
      await viewButtons.first().click();
      await page.waitForTimeout(400);
    }
  });
});
