import { expect, test } from '@playwright/test';

test('two friends join, draft simultaneously, and start local defense', async ({ browser }) => {
  test.setTimeout(45_000);
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  await second.addInitScript(() => {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: undefined });
  });
  const pageErrors: string[] = [];
  first.on('pageerror', (error) => pageErrors.push(error.message));
  second.on('pageerror', (error) => pageErrors.push(error.message));

  await Promise.all([
    first.goto('/?mode=coop&server=ws://127.0.0.1:4274'),
    second.goto('/?mode=coop&server=ws://127.0.0.1:4274'),
  ]);
  await expect(first.getByRole('button', { name: 'Settings' })).toBeVisible();
  await first.getByLabel('Display name').fill('Alpha');
  await first.getByRole('button', { name: 'Create co-op room' }).click();
  const roomCode = await first.locator('h1[class*="code"]').textContent();
  expect(roomCode).toMatch(/^[A-Z2-9]{6}$/);

  await second.getByLabel('Display name').fill('Beta');
  await second.getByLabel('Room code').fill(roomCode!);
  await second.getByRole('button', { name: 'Join room' }).click();
  await expect(first.getByText('Beta')).toBeVisible();
  await expect(first.getByRole('button', { name: 'Settings' })).toBeVisible();

  await Promise.all([
    first.getByRole('button', { name: 'Ready', exact: true }).click(),
    second.getByRole('button', { name: 'Ready', exact: true }).click(),
  ]);

  for (let pick = 0; pick < 3; pick += 1) {
    const firstOwnOffer = first.getByRole('heading', { name: 'Alpha · You' }).locator('..');
    const secondOwnOffer = second.getByRole('heading', { name: 'Beta · You' }).locator('..');
    await expect(firstOwnOffer).toBeVisible();
    await expect(secondOwnOffer).toBeVisible();
    await expect(first.getByRole('button', { name: 'Settings' })).toBeVisible();
    if (pick === 0) {
      const progress = first.getByRole('progressbar');
      const progressBounds = await progress.evaluate((element) => {
        const root = element.getBoundingClientRect();
        const label = element.querySelector('span')?.getBoundingClientRect();
        return { rootRight: root.right, labelRight: label?.right ?? Number.POSITIVE_INFINITY };
      });
      expect(progressBounds.labelRight).toBeLessThanOrEqual(progressBounds.rootRight + 1);
      const peerChoiceGap = await first.locator('[class*="peerChoices"] details').first().evaluate((element) => {
        const choice = element.getBoundingClientRect();
        const summary = element.querySelector('summary')?.getBoundingClientRect();
        return choice.bottom - (summary?.bottom ?? 0);
      });
      expect(peerChoiceGap).toBeLessThanOrEqual(1);
      await firstOwnOffer.getByRole('button', { name: 'View thought' }).first().click();
      await expect(first.getByRole('main', { name: 'Thought Index' })).toBeVisible();
      await expect(first.getByRole('button', { name: 'Settings' })).toBeVisible();
      await first.getByRole('button', { name: 'Return to the current battlefield' }).click();
    }
    await firstOwnOffer.getByRole('button', { name: 'Choose module' }).first().click();
    await expect(firstOwnOffer.locator('[class*="selectedCard"]')).toHaveCount(1);
    await expect(firstOwnOffer.locator('[class*="dimmedCard"]')).toHaveCount(3);
    await secondOwnOffer.getByRole('button', { name: 'Choose module' }).first().click();
  }

  await expect(first.getByRole('img', { name: 'Tower-defense battlefield' })).toBeVisible();
  await expect(second.getByRole('img', { name: 'Tower-defense battlefield' })).toBeVisible();
  await expect(first.getByRole('group', { name: 'Speed' })).toHaveCount(0);
  await expect(first.getByRole('button', { name: 'Pause' })).toHaveCount(0);
  await expect(first.getByRole('button', { name: 'Settings' })).toBeVisible();
  const coopConsoleButton = first.getByRole('button', { name: 'Co-op console', exact: true });
  await expect(first.getByText('Next-wave signals').locator('..').getByRole('button', { name: 'Co-op console' })).toBeVisible();
  await expect(coopConsoleButton).toBeVisible();
  await coopConsoleButton.click();
  await expect(first.getByRole('dialog', { name: 'Bastion relay' })).toContainText('Beta');
  await first.getByRole('button', { name: 'Send to Beta' }).click();
  await expect(first.getByText('Sent 20 shards to Beta')).toBeVisible();
  await expect(second.getByText('Received 20 shards from Alpha')).toBeVisible();
  await first.getByRole('button', { name: 'Close co-op console' }).click();

  await first.locator('.launch-button').click();
  const cancelReady = first.getByRole('button', { name: 'Cancel ready' });
  await expect(cancelReady).toBeVisible();
  await coopConsoleButton.click();
  await expect(first.getByRole('dialog', { name: 'Bastion relay' }).getByRole('button', { name: 'Cancel ready' })).toHaveCount(0);
  await first.getByRole('button', { name: 'Close co-op console' }).click();
  await cancelReady.click();
  await expect(first.locator('.launch-button')).toContainText('Launch signal');

  await Promise.all([first.locator('.launch-button').click(), second.locator('.launch-button').click()]);
  await coopConsoleButton.click();
  await expect(first.getByRole('dialog', { name: 'Bastion relay' })).toContainText('Local defense');
  const viewPeerDefense = first.getByRole('button', { name: "View Beta's defense" });
  await expect(viewPeerDefense).toBeEnabled();
  await viewPeerDefense.click();
  await expect(first.locator('[data-viewed-player="p2"]')).toBeVisible();
  await expect(first.getByRole('group', { name: 'Installed modules' })).toHaveCount(1);
  await expect(first.locator('[data-coop-tower-loadout] [data-module-id]')).toHaveCount(2);
  await first.getByRole('button', { name: 'Return to my defense' }).click();
  await expect(first.locator('[data-viewed-player="p1"]')).toBeVisible();
  await expect(first.getByRole('group', { name: 'Installed modules' })).toHaveCount(0);
  expect(pageErrors).toEqual([]);

  await firstContext.close();
  await secondContext.close();
});

test('the entry screen can return to the single-player build', async ({ page }) => {
  await page.goto('/coop.html?server=ws://127.0.0.1:4274');
  await expect(page).toHaveURL(/mode=coop/);
  await page.getByRole('button', { name: 'Return to single player' }).click();
  await expect(page).toHaveURL(/\?server=ws%3A%2F%2F127\.0\.0\.1%3A4274$/);
  await expect(page.getByRole('heading', { name: 'Would you like a guided start?' })).toBeVisible();
});

test('the full site defaults to single player and idle preload opens no socket', async ({ page }) => {
  const sockets: string[] = [];
  page.on('websocket', (socket) => sockets.push(socket.url()));
  await page.addInitScript(() => localStorage.setItem('prism-bastion-tutorial-offer-resolved', '1'));
  await page.goto('/?server=ws://127.0.0.1:4274');
  await expect(page.getByRole('button', { name: 'Co-op' })).toBeVisible();
  await page.waitForTimeout(1_700);
  expect(sockets).toEqual([]);
  await page.getByRole('button', { name: 'Co-op' }).click();
  await expect(page).toHaveURL(/mode=coop/);
  await expect(page.getByRole('heading', { name: 'Defend in parallel' })).toBeVisible();
  expect(sockets).toEqual([]);
});

test('leaving a room returns the leaver to single player and the peer to the co-op entry', async ({ browser }) => {
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();

  await Promise.all([
    first.goto('/?mode=coop&server=ws://127.0.0.1:4274'),
    second.goto('/?mode=coop&server=ws://127.0.0.1:4274'),
  ]);
  await first.getByLabel('Display name').fill('Alpha');
  await first.getByRole('button', { name: 'Create co-op room' }).click();
  const roomCode = await first.locator('h1[class*="code"]').textContent();
  await second.getByLabel('Display name').fill('Beta');
  await second.getByLabel('Room code').fill(roomCode!);
  await second.getByRole('button', { name: 'Join room' }).click();
  await expect(first.getByText('Beta')).toBeVisible();

  await second.getByRole('button', { name: 'Leave room' }).click();
  await expect(second).not.toHaveURL(/mode=coop/);
  await expect(second.getByRole('button', { name: 'Co-op' })).toBeVisible();
  await expect(first.getByRole('heading', { name: 'Defend in parallel' })).toBeVisible();
  await expect(first.getByRole('alert')).toContainText('room was closed');

  await firstContext.close();
  await secondContext.close();
});
