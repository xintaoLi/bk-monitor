export async function openApp(ctx, url = "http://localhost:3000") {
  const { browser, page } = ctx;
  
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  
  return { browser, page };
}

export async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    console.warn(`Element not found: ${selector}`);
    return false;
  }
}

export async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  await page.screenshot({ path: `screenshots/${filename}` });
  return filename;
}

export async function fillForm(page, formData) {
  for (const [selector, value] of Object.entries(formData)) {
    await page.type(selector, value);
  }
}

export async function clickAndWait(page, selector, waitSelector) {
  await page.click(selector);
  if (waitSelector) {
    await page.waitForSelector(waitSelector);
  }
}