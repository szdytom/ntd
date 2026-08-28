import { expect, test, type Page } from '@playwright/test';

async function completeInitialDraft(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: '选择初始模块' });
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

  await completeInitialDraft(page);
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

test('level carousel keeps three cards visible and launches the beginner map', async ({ page }) => {
  await page.goto('/');
  const levelGroup = page.getByRole('radiogroup', { name: '选择防御区' });
  await expect(levelGroup.getByRole('radio')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: /启航折线/ })).toBeVisible();

  await page.getByRole('button', { name: '显示下一组关卡' }).click();
  await expect(levelGroup.getByRole('radio')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: /翠光折返/ })).toBeVisible();
  await page.getByRole('button', { name: '显示上一组关卡' }).click();

  await page.getByRole('radio', { name: /启航折线/ }).click();
  await page.getByRole('button', { name: /部署至/ }).click();
  await expect(page.getByRole('heading', { name: /启航折线 \/ SECTOR/, level: 1 })).toBeVisible();
  const tutorial = page.getByRole('region', { name: '启航折线教程' });
  await expect(tutorial.getByRole('heading', { name: '欢迎来到启航折线' })).toBeVisible();
  const tutorialCard = tutorial.locator('.tutorial-card');
  const initialCardBox = await tutorialCard.boundingBox();
  const dragHandleBox = await tutorial.getByRole('button', { name: '拖动教程提示框' }).boundingBox();
  if (!initialCardBox || !dragHandleBox) throw new Error('Expected a draggable tutorial card');
  await page.mouse.move(dragHandleBox.x + dragHandleBox.width / 2, dragHandleBox.y + dragHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragHandleBox.x + dragHandleBox.width / 2, dragHandleBox.y - 90, { steps: 5 });
  await page.mouse.up();
  const movedCardBox = await tutorialCard.boundingBox();
  expect(movedCardBox?.x ?? 0).toBeCloseTo(initialCardBox.x, 0);
  expect(movedCardBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(initialCardBox.y - 30);
  await tutorial.getByRole('button', { name: '开始校准' }).click();
  await tutorial.getByRole('button', { name: '点击高亮的炮塔' }).click();
  let workshop = page.getByLabel('炮塔模块工作台');
  await expect(tutorial.locator('.tutorial-spotlight.drag-source')).toHaveCount(1);
  await expect(tutorial.locator('.tutorial-spotlight.drag-destination')).toHaveCount(1);
  await workshop.locator('[data-tutorial-module="frost"]').dragTo(workshop.locator('[data-tutorial-slot="0"]'));
  await expect(tutorial.getByRole('heading', { name: '把脉冲拖到槽位 2' })).toBeVisible();
  await workshop.locator('[data-tutorial-module="pulse"]').dragTo(workshop.locator('[data-tutorial-slot="1"]'));
  await tutorial.getByRole('button', { name: '明白了' }).click();
  await tutorial.getByRole('button', { name: '点击工作台右上角的关闭按钮' }).click();
  await expect(page.getByLabel('炮塔模块工作台')).toHaveCount(0);
  await tutorial.getByRole('button', { name: '点击高亮的空节点建造炮塔' }).click();
  workshop = page.getByLabel('炮塔模块工作台');
  await expect(tutorial.getByRole('heading', { name: '给新炮塔安装脉冲' })).toBeVisible();
  await workshop.locator('[data-tutorial-module="pulse"]').dragTo(workshop.locator('[data-tutorial-slot="0"]'));
  await tutorial.getByRole('button', { name: '点击工作台右上角的关闭按钮' }).click();
  await tutorial.getByRole('button', { name: '点击“启动信号”' }).click();

  await expect(page.getByText('观察模块组合的效果')).toBeVisible();
  await page.getByRole('button', { name: '2×' }).click();
  await page.getByText('键盘战场控制').click();
  await page.getByRole('button', { name: '选择节点 T02' }).click();
  await expect(tutorial.getByRole('heading', { name: '当前不是教程炮塔' })).toBeVisible({ timeout: 20_000 });
  await tutorial.getByRole('button', { name: '先关闭当前 ARC 工作台' }).click();
  await expect(tutorial.getByRole('heading', { name: '重新打开教程炮塔' })).toBeVisible();
  await tutorial.getByRole('button', { name: '点击高亮的初始炮塔' }).click();
  workshop = page.getByLabel('炮塔模块工作台');
  await expect(tutorial.getByRole('heading', { name: '把脉冲从槽位 2 移到槽位 3' })).toBeVisible();
  await workshop.locator('[data-tutorial-slot="1"]').dragTo(workshop.locator('[data-tutorial-slot="2"]'));
  await expect(tutorial.getByRole('heading', { name: '把命中触发拖到槽位 2' })).toBeVisible();
  await workshop.locator('[data-tutorial-module="impact-trigger"]').dragTo(workshop.locator('[data-tutorial-slot="1"]'));
  await expect(tutorial.getByRole('heading', { name: '把感应雷拖到槽位 4' })).toBeVisible();
  await workshop.locator('[data-tutorial-module="proximity-mine"]').dragTo(workshop.locator('[data-tutorial-slot="3"]'));
  await tutorial.getByRole('button', { name: '准备迎敌' }).click();
  await tutorial.getByRole('button', { name: '点击工作台右上角的关闭按钮' }).click();
  await expect(page.getByLabel('炮塔模块工作台')).toHaveCount(0);
  await tutorial.getByRole('button', { name: '点击“启动信号”完成教程' }).click();
  await expect(tutorial).toHaveCount(0);
});
