
import { test } from '@playwright/test';
import { expect } from '@playwright/test';

test('HeroAlignment_2025-10-01', async ({ page, context }) => {
  
    // Navigate to URL
    await page.goto('http://localhost:3000');

    // Take screenshot
    await page.screenshot({ path: 'desktop-1920x1080.png', { fullPage: true } });

    // Navigate to URL
    await page.goto('http://localhost:3000');

    // Take screenshot
    await page.screenshot({ path: 'tablet-768x1024.png', { fullPage: true } });

    // Navigate to URL
    await page.goto('http://localhost:3000');

    // Take screenshot
    await page.screenshot({ path: 'mobile-375x667.png', { fullPage: true } });

    // Take screenshot
    await page.screenshot({ path: 'final-desktop-verification.png', { fullPage: true } });
});