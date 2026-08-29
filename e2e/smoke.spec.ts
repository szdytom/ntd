import { expect, test, type Page } from '@playwright/test';

async function completeInitialDraft(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Choose initial modules' });
  for (let round = 0; round < 3; round += 1) {
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.reward-card')).toHaveCount(4);
    await dialog.locator('.reward-card').first().click();
  }
  await expect(dialog).toHaveCount(0);
}

test('setup and battlefield work in a real browser', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');

  const normal = page.getByRole('radio', { name: /Normal/ });
  await normal.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: /^◆ Hard/ })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: /Deploy to/ }).click();
  const canvas = page.getByRole('img', { name: 'Tower-defense battlefield' });
  await expect(canvas).toBeVisible();
  const size = await canvas.boundingBox();
  expect(size?.width ?? 0).toBeGreaterThan(500);
  expect(size?.height ?? 0).toBeGreaterThan(300);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await completeInitialDraft(page);
  await page.getByText('Keyboard battlefield controls').click();
  await page.getByRole('button', { name: 'Deploy node 2' }).click();
  await expect(page.getByRole('button', { name: 'Select node T02' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('mobile setup keeps primary controls reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Standard/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Creative/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Deploy to/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Language' }).selectOption('zh-CN');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
});

test('creative economy and signal controls are independent from the workshop', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Creative/ }).click();
  await page.getByRole('button', { name: /Deploy to/ }).click();

  await expect(page.getByText('∞', { exact: true })).toBeVisible();
  const signalButton = page.getByRole('button', { name: 'Signal console' });
  await expect(signalButton).toBeVisible();
  await signalButton.click();
  await expect(page.getByRole('heading', { name: 'Creative Signal Console' })).toBeVisible();
  await signalButton.click();

  await page.getByText('Keyboard battlefield controls').click();
  await page.getByRole('button', { name: 'Select node T01' }).click();
  await expect(page.getByLabel('Tower module workshop').locator('.creative-lab')).toHaveCount(0);
});

test('level carousel keeps three cards visible and launches the beginner map', async ({ page }) => {
  await page.goto('/');
  const levelGroup = page.getByRole('radiogroup', { name: 'Choose defense sector' });
  await expect(levelGroup.getByRole('radio')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: /Launch Elbow/ })).toBeVisible();

  await page.getByRole('button', { name: 'Show next levels' }).click();
  await expect(levelGroup.getByRole('radio')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: /Verdant Fold/ })).toBeVisible();
  await page.getByRole('button', { name: 'Show previous levels' }).click();

  await page.getByRole('radio', { name: /Launch Elbow/ }).click();
  await page.getByRole('button', { name: /Deploy to/ }).click();
  await expect(page.getByRole('heading', { name: /Launch Elbow \/ SECTOR/, level: 1 })).toBeVisible();
  const tutorial = page.getByRole('region', { name: 'Launch Elbow tutorial' });
  await expect(tutorial.getByRole('heading', { name: 'Welcome to Launch Elbow' })).toBeVisible();
  const tutorialCard = tutorial.locator('.tutorial-card');
  const initialCardBox = await tutorialCard.boundingBox();
  const dragHandleBox = await tutorial.getByRole('button', { name: 'Move tutorial panel' }).boundingBox();
  if (!initialCardBox || !dragHandleBox) throw new Error('Expected a draggable tutorial card');
  await page.mouse.move(dragHandleBox.x + dragHandleBox.width / 2, dragHandleBox.y + dragHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragHandleBox.x + dragHandleBox.width / 2, dragHandleBox.y - 90, { steps: 5 });
  await page.mouse.up();
  const movedCardBox = await tutorialCard.boundingBox();
  expect(movedCardBox?.x ?? 0).toBeCloseTo(initialCardBox.x, 0);
  expect(movedCardBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(initialCardBox.y - 30);
  await tutorial.getByRole('button', { name: 'Begin calibration' }).click();
  await tutorial.getByRole('button', { name: 'Click the highlighted tower' }).click();
  let workshop = page.getByLabel('Tower module workshop');
  await expect(tutorial.locator('.tutorial-spotlight.drag-source')).toHaveCount(1);
  await expect(tutorial.locator('.tutorial-spotlight.drag-destination')).toHaveCount(1);
  await workshop.locator('[data-tutorial-module="frost"]').dragTo(workshop.locator('[data-tutorial-slot="0"]'));
  await expect(tutorial.getByRole('heading', { name: 'Drag Pulse into slot 2' })).toBeVisible();
  await workshop.locator('[data-tutorial-module="pulse"]').dragTo(workshop.locator('[data-tutorial-slot="1"]'));
  await tutorial.getByRole('button', { name: 'Got it' }).click();
  await tutorial.getByRole('button', { name: 'Click the close button in the workshop header' }).click();
  await expect(page.getByLabel('Tower module workshop')).toHaveCount(0);
  await tutorial.getByRole('button', { name: 'Click the highlighted empty node to build' }).click();
  workshop = page.getByLabel('Tower module workshop');
  await expect(tutorial.getByRole('heading', { name: 'Install Pulse in the new tower' })).toBeVisible();
  await workshop.locator('[data-tutorial-module="pulse"]').dragTo(workshop.locator('[data-tutorial-slot="0"]'));
  await tutorial.getByRole('button', { name: 'Click the close button in the workshop header' }).click();
  await tutorial.getByRole('button', { name: 'Click “Launch signal”' }).click();

  await expect(page.getByText('Observe the module combination')).toBeVisible();
  await page.getByRole('button', { name: '2×' }).click();
  await page.getByText('Keyboard battlefield controls').click();
  await page.getByRole('button', { name: 'Select node T02' }).click();
  await expect(tutorial.getByRole('heading', { name: 'This is not the tutorial tower' })).toBeVisible({ timeout: 20_000 });
  await tutorial.getByRole('button', { name: 'Close the current Arc Workshop' }).click();
  await expect(tutorial.getByRole('heading', { name: 'Reopen the tutorial tower' })).toBeVisible();
  await tutorial.getByRole('button', { name: 'Click the highlighted starting tower' }).click();
  workshop = page.getByLabel('Tower module workshop');
  await expect(tutorial.getByRole('heading', { name: 'Move Pulse from slot 2 to slot 3' })).toBeVisible();
  await workshop.locator('[data-tutorial-slot="1"]').dragTo(workshop.locator('[data-tutorial-slot="2"]'));
  await expect(tutorial.getByRole('heading', { name: 'Drag Impact into slot 2' })).toBeVisible();
  await workshop.locator('[data-tutorial-module="impact-trigger"]').dragTo(workshop.locator('[data-tutorial-slot="1"]'));
  await expect(tutorial.getByRole('heading', { name: 'Drag Mine into slot 4' })).toBeVisible();
  await workshop.locator('[data-tutorial-module="proximity-mine"]').dragTo(workshop.locator('[data-tutorial-slot="3"]'));
  await tutorial.getByRole('button', { name: 'Ready' }).click();
  await tutorial.getByRole('button', { name: 'Click the close button in the workshop header' }).click();
  await expect(page.getByLabel('Tower module workshop')).toHaveCount(0);
  await tutorial.getByRole('button', { name: 'Click “Launch signal” to finish the tutorial' }).click();
  await expect(tutorial).toHaveCount(0);
});
