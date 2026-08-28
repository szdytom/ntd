import { expect, test } from '@playwright/test';

test('setup and battlefield work in a real browser', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');

  const normal = page.getByRole('radio', { name: /正常/ });
  await normal.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: /^◆ 困难/ })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: /部署至/ }).click();
  const canvas = page.getByRole('img', { name: '塔防游戏战场' });
  await expect(canvas).toBeVisible();
  const size = await canvas.boundingBox();
  expect(size?.width ?? 0).toBeGreaterThan(500);
  expect(size?.height ?? 0).toBeGreaterThan(300);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.getByText('键盘战场控制').click();
  await page.getByRole('button', { name: '部署节点 2' }).click();
  await expect(page.getByRole('button', { name: '选择节点 T02' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('mobile setup keeps primary controls reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /正式模式/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /创造模式/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /部署至/ })).toBeVisible();
});

test('creative economy and signal controls are independent from the workshop', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /创造模式/ }).click();
  await page.getByRole('button', { name: /部署至/ }).click();

  await expect(page.getByText('∞', { exact: true })).toBeVisible();
  const signalButton = page.getByRole('button', { name: '信号台' });
  await expect(signalButton).toBeVisible();
  await signalButton.click();
  await expect(page.getByRole('heading', { name: '创造模式信号台' })).toBeVisible();
  await signalButton.click();

  await page.getByText('键盘战场控制').click();
  await page.getByRole('button', { name: '选择节点 T01' }).click();
  await expect(page.getByLabel('炮塔模块工作台').locator('.creative-lab')).toHaveCount(0);
});
