import { openApp, fillForm, clickAndWait } from "../utils/browser.js";

export default async function run(ctx) {
  const { browser, page } = await openApp(ctx, "http://localhost:3000/login");

  try {
    // Wait for login form to load
    await page.waitForSelector('[data-testid="login-form"]');
    
    // Fill login form
    await fillForm(page, {
      '[data-testid="username-input"]': 'admin',
      '[data-testid="password-input"]': '123456'
    });
    
    // Submit form and wait for dashboard
    await clickAndWait(
      page, 
      '[data-testid="login-btn"]',
      '[data-testid="dashboard"]'
    );
    
    console.log('✅ Login test passed');
    
  } catch (error) {
    console.error('❌ Login test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}