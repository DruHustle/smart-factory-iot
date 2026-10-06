import { expect, type Page, test } from "@playwright/test";

async function loginAs(page: Page, role: "admin" | "engineer" | "viewer") {
  const accounts = {
    admin: { button: "Demo Admin", email: "admin@dev.local" },
    engineer: { button: "Demo Engineer", email: "tech@dev.local" },
    viewer: { button: "Demo Viewer", email: "demo@dev.local" },
  } as const;
  await page.goto("/#/login");
  await page.getByRole("button", { name: accounts[role].button, exact: true }).click();
  await expect(page.getByLabel("Email")).toHaveValue(accounts[role].email);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page.getByRole("heading", { name: "Factory Overview" })).toBeVisible();
}

async function expectSoundDocumentStructure(page: Page) {
  const audit = await page.evaluate(() => {
    const duplicateIds = Array.from(document.querySelectorAll<HTMLElement>("[id]"))
      .map((element) => element.id)
      .filter((id, index, ids) => id && ids.indexOf(id) !== index);

    const controls = Array.from(document.querySelectorAll<HTMLElement>(
      "button, a[href], input:not([type='hidden']), textarea, select, [role='button'], [role='link'], [role='combobox']",
    ));
    const textFromIds = (ids: string) => ids.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim() ?? "").join(" ").trim();
    const controlName = (element: HTMLElement) => {
      const labelledBy = element.getAttribute("aria-labelledby");
      const ownId = element.id;
      return element.getAttribute("aria-label")?.trim()
        || (labelledBy ? textFromIds(labelledBy) : "")
        || (ownId ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(ownId)}"]`)?.textContent?.trim() : "")
        || element.getAttribute("title")?.trim()
        || element.innerText?.trim()
        || "";
    };
    const unnamedControls = controls
      .filter((element) => element.getAttribute("aria-hidden") !== "true" && !controlName(element))
      .map((element) => `${element.tagName.toLowerCase()}${element.getAttribute("role") ? `[role=${element.getAttribute("role")}]` : ""}`);

    return {
      duplicateIds: [...new Set(duplicateIds)],
      unnamedControls,
      mainCount: document.querySelectorAll("main").length,
      h1Count: document.querySelectorAll("h1").length,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(audit.duplicateIds).toEqual([]);
  expect(audit.unnamedControls).toEqual([]);
  expect(audit.mainCount).toBe(1);
  expect(audit.h1Count).toBeGreaterThanOrEqual(1);
  expect(audit.horizontalOverflow).toBeLessThanOrEqual(1);
}

test("signed-out and authenticated routes expose named controls and sound landmarks", async ({ page }) => {
  await page.goto("/#/login");
  await expect(page.getByRole("heading", { name: "Smart Factory IoT" })).toBeVisible();
  await expectSoundDocumentStructure(page);
  const password = page.locator("#password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");

  await loginAs(page, "viewer");
  const routes = [
    ["/", "Factory Overview"],
    ["/monitoring", "Live Monitoring"],
    ["/devices", "Gateway & Edge Device Connectivity"],
    ["/assets", "Industrial Assets"],
    ["/alerts", "Alerts & Event History"],
    ["/notifications", "Notifications"],
    ["/analytics", "Asset Analytics"],
    ["/assistant", "Chat with the Factory Assistant"],
  ] as const;

  for (const [route, heading] of routes) {
    await page.goto(`/#${route}`);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expectSoundDocumentStructure(page);
  }

  await page.goto("/#/devices");
  await expect(page.getByRole("button", { name: "Devices", exact: true })).toHaveAttribute("aria-current", "page");
  const resizer = page.getByRole("separator", { name: "Resize navigation" });
  const originalWidth = Number(await resizer.getAttribute("aria-valuenow"));
  await resizer.focus();
  await page.keyboard.press("ArrowRight");
  await expect(resizer).toHaveAttribute("aria-valuenow", String(Math.min(400, originalWidth + 10)));
});

test("core operational routes remain within a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page, "viewer");

  for (const route of ["/", "/monitoring", "/devices", "/assets", "/alerts", "/notifications", "/analytics", "/assistant"]) {
    await page.goto(`/#${route}`);
    await expect(page.locator("#dashboard-main")).toBeVisible();
    await expectSoundDocumentStructure(page);
  }

  const menu = page.getByRole("button", { name: /toggle sidebar/i });
  await menu.click();
  await expect(page.getByRole("button", { name: "Monitoring", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Monitoring", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Live Monitoring", exact: true })).toBeVisible();
});
