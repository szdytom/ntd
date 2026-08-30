import { expect, test, type Page } from '@playwright/test';
import {
  DEFAULT_LEVEL_ID,
  ENEMIES,
  getLevel,
  resolveSpawnEntrances,
  TUTORIAL_LEVEL_ID,
  type LevelDefinition,
} from '../src/game/config';
import type { EnemyType, Point } from '../src/game/types';
import { DRAFT_BALANCE } from '../src/modules';

const WORLD = { width: 1160, height: 650 } as const;
const TUTORIAL_OFFER_STORAGE_KEY = 'prism-bastion-tutorial-offer-resolved';
const defaultLevel = getLevel(DEFAULT_LEVEL_ID);
const tutorialLevel = getLevel(TUTORIAL_LEVEL_ID);
const triuneLevel = getLevel('triune-delta');
const enemyTypes = Object.keys(ENEMIES) as EnemyType[];

const formatValue = (value: number): string => Number.isInteger(value)
  ? String(value)
  : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

function towerPad(level: LevelDefinition, index: number): Point {
  const pad = level.towerPads[index];
  if (!pad) throw new Error(`Expected tower pad ${index} in ${level.id}`);
  return pad;
}

function configuredSignalCounts(level: LevelDefinition, waveIndex: number): Map<EnemyType, number> {
  const counts = new Map<EnemyType, number>();
  for (const entry of level.waves[waveIndex] ?? []) {
    const count = resolveSpawnEntrances(entry, level.graph).length;
    counts.set(entry.type, (counts.get(entry.type) ?? 0) + count);
  }
  return counts;
}

function archiveNumber(type: EnemyType): string {
  return String(enemyTypes.indexOf(type) + 1).padStart(2, '0');
}

async function prepareReturningPlayer(page: Page): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, '1'), TUTORIAL_OFFER_STORAGE_KEY);
}

async function clickBattlefieldAt(page: Page, point: Point): Promise<void> {
  const canvas = page.getByRole('img', { name: 'Tower-defense battlefield' });
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Expected the battlefield canvas to have bounds');
  const scale = Math.min(bounds.width / WORLD.width, bounds.height / WORLD.height);
  const offsetX = (bounds.width - WORLD.width * scale) / 2;
  const offsetY = (bounds.height - WORLD.height * scale) / 2;
  await page.mouse.click(bounds.x + offsetX + point.x * scale, bounds.y + offsetY + point.y * scale);
}

async function completeInitialDraft(page: Page, level: LevelDefinition): Promise<void> {
  const dialog = page.getByRole('region', { name: 'Choose initial modules' });
  for (let round = 0; round < level.moduleDraft.initialPicks; round += 1) {
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.reward-card')).toHaveCount(DRAFT_BALANCE.choicesPerOffer);
    await dialog.locator('.reward-card').first().click();
  }
  await expect(dialog).toHaveCount(0);
}

test('first visit offers the tutorial and remembers a final choice', async ({ page }) => {
  await page.goto('/');
  const offer = page.locator('.tutorial-offer');
  await expect(offer).toBeVisible();
  await expect(offer).toHaveAccessibleName('Would you like a guided start?');
  await offer.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: '\u4e2d\u6587' }).click();
  await expect(offer.getByRole('heading', { name: '\u9700\u8981\u5148\u5b8c\u6210\u64cd\u4f5c\u6559\u7a0b\u5417\uff1f' })).toBeVisible();
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('button', { name: 'Close settings' }).click();

  await offer.getByRole('button', { name: /Start Launch Elbow/ }).click();
  await expect(page.getByRole('heading', { name: 'Launch Elbow T-0', level: 1 })).toBeVisible();
  const tutorial = page.getByRole('region', { name: 'Launch Elbow tutorial' });
  await expect(tutorial.getByRole('heading', { name: 'Welcome to Launch Elbow' })).toBeVisible();
  await tutorial.getByRole('button', { name: 'Skip tutorial' }).click();
  await page.getByRole('button', { name: 'Return to level selection' }).click();
  await page.reload();
  await expect(offer).toHaveCount(0);

  await page.evaluate((key) => localStorage.removeItem(key), TUTORIAL_OFFER_STORAGE_KEY);
  await page.reload();
  await expect(offer).toBeVisible();
  await offer.getByRole('button', { name: 'No, thanks' }).click();
  await page.reload();
  await expect(offer).toHaveCount(0);
});

test('setup and battlefield work in a real browser', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await prepareReturningPlayer(page);
  await page.goto('/');

  const standardDifficulty = page.getByRole('radio', { name: /Standard/ });
  await standardDifficulty.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: /^◆ Hard/ })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('button', { name: /Start deployment/ }).click();
  const canvas = page.getByRole('img', { name: 'Tower-defense battlefield' });
  await expect(canvas).toBeVisible();
  const size = await canvas.boundingBox();
  expect(size?.width ?? 0).toBeGreaterThan(500);
  expect(size?.height ?? 0).toBeGreaterThan(300);
  await expect(page.getByRole('alert')).toHaveCount(0);

  await completeInitialDraft(page, defaultLevel);
  await clickBattlefieldAt(page, towerPad(defaultLevel, 1));
  await expect(page.getByLabel('Tower module workshop').locator('.tower-id')).toHaveText('Node 02');
  expect(pageErrors).toEqual([]);
});

test('mobile setup keeps primary controls reachable', async ({ page }) => {
  await prepareReturningPlayer(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const modeGroup = page.getByRole('group', { name: 'Game mode' });
  await expect(modeGroup.getByRole('button', { name: /Standard/ })).toBeVisible();
  await expect(modeGroup.getByRole('button', { name: /Creative/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Start deployment/ })).toBeVisible();
  await modeGroup.getByRole('button', { name: /Creative/ }).click();
  await expect(page.getByRole('button', { name: /Creative .* Start deployment/ })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: '\u4e2d\u6587' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('button', { name: /\u5f00\u59cb\u90e8\u7f72/ })).toBeVisible();
});

test('the multi-entrance sector renders its route tree and all battlefield entrances', async ({ page }) => {
  await prepareReturningPlayer(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Show next levels' }).click();
  await page.getByRole('button', { name: 'Show next levels' }).click();
  const triune = page.getByRole('radio', { name: /Triune Delta/ });
  await expect(triune).toBeVisible();
  await expect(triune.getByText(`${triuneLevel.waves.length} waves`)).toBeVisible();
  await expect(triune.locator('.route-edge')).toHaveCount(triuneLevel.graph.edges.length);
  const junctionCount = [...triuneLevel.graph.nodes.values()].filter((node) => node.children.length > 1).length;
  await expect(triune.locator('.route-junction')).toHaveCount(junctionCount);
  await triune.click();
  await page.getByRole('button', { name: /Creative/ }).click();
  await page.getByRole('button', { name: /Start deployment/ }).click();

  await expect(page.getByRole('heading', { name: 'Triune Delta D-6', level: 1 })).toBeVisible();
  await expect(page.locator('.spawn-label')).toHaveCount(triuneLevel.graph.entrances.length);
  for (const [type, count] of configuredSignalCounts(triuneLevel, 0)) {
    await expect(page.getByTitle(`${ENEMIES[type].name} × ${count}`)).toBeVisible();
  }
});

test('signal compendium exposes every signal profile from its own entry', async ({ page }) => {
  await prepareReturningPlayer(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Open signal compendium' }).click();
  await expect(page.getByRole('heading', { name: 'Signal Compendium' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
  const index = page.getByRole('navigation', { name: 'Enemy signal index' });
  const consoleFrame = page.locator('.enemy-archive-console');
  const initialFrameHeight = await consoleFrame.evaluate((element) => element.getBoundingClientRect().height);
  await expect(index.getByRole('button')).toHaveCount(enemyTypes.length);
  await expect(page.locator('.enemy-archive-seal b')).toHaveText(archiveNumber('spark'));
  await index.getByRole('button', { name: /Surge/ }).click();
  await expect(page.getByRole('heading', { name: 'Surge' })).toBeVisible();
  await expect(page.locator('.enemy-archive-seal b')).toHaveText(archiveNumber('surge'));
  await expect(page.getByText('Waveform surge')).toBeVisible();
  await expect(page.locator('[data-stat="speed"] strong')).toHaveText(`${formatValue(ENEMIES.surge.speed)} u/s`);
  await index.getByRole('button', { name: /Prism Crown/ }).click();
  await expect(page.getByRole('heading', { name: 'Prism Crown' })).toBeVisible();
  await expect(page.locator('.enemy-archive-seal b')).toHaveText(archiveNumber('crown'));
  await expect(page.getByText('Regenerating shield lattice')).toBeVisible();
  await expect(page.locator('.enemy-archive-specimen')).toHaveAttribute('data-has-shield', 'true');
  expect(await page.locator('.enemy-archive-specimen').evaluate((canvas) => (
    canvas instanceof HTMLCanvasElement && canvas.getContext('webgl2') instanceof WebGL2RenderingContext
  ))).toBe(true);
  await page.waitForTimeout(1_400);
  await expect(page.locator('.enemy-archive-specimen')).toHaveAttribute('data-projectile-visible', 'true');
  await index.getByRole('button', { name: /Fracture Star/ }).click();
  await expect(page.getByRole('heading', { name: 'Fracture Star' })).toBeVisible();
  await expect(page.locator('.enemy-archive-specimen')).toHaveAttribute('data-specimen-count', '1');
  await page.getByRole('button', { name: 'Show fragments' }).click();
  await expect(page.getByRole('heading', { name: 'Fracture Fragments' })).toBeVisible();
  const fracture = ENEMIES.fracture;
  const split = fracture.split;
  if (!split) throw new Error('Expected the fracture signal to define splitting');
  await expect(page.locator('.enemy-archive-specimen')).toHaveAttribute('data-specimen-count', String(split.count));
  await expect(page.locator('[data-stat="health"] strong')).toHaveText(formatValue(Math.max(1, Math.round(fracture.hp * split.healthScale))));
  await expect(page.locator('[data-stat="speed"] strong')).toHaveText(`${formatValue(fracture.speed * split.speedScale)} u/s`);
  await expect(page.locator('[data-stat="reward"] strong')).toHaveText(`${formatValue(Math.max(1, Math.round(fracture.reward * split.rewardScale)))} ◇`);
  await expect(page.locator('[data-stat="coreDamage"] strong')).toHaveText(formatValue(Math.max(1, Math.round(fracture.coreDamage * split.coreDamageScale))));
  await page.getByRole('button', { name: 'Restore core' }).click();
  await expect(page.getByRole('heading', { name: 'Fracture Star' })).toBeVisible();
  await expect(page.locator('.enemy-archive-specimen')).toHaveAttribute('data-specimen-count', '1');
  await index.getByRole('button', { name: /Prism Anvil/ }).click();
  await expect(page.getByRole('heading', { name: 'Prism Anvil' })).toBeVisible();
  await expect(page.locator('.enemy-archive-seal b')).toHaveText(archiveNumber('anvil'));
  await expect(page.getByText('Layered armor')).toBeVisible();
  await expect(page.locator('[data-stat="health"] strong')).toHaveText(formatValue(ENEMIES.anvil.hp));
  await expect(page.locator('[data-stat="speed"] strong')).toHaveText(`${formatValue(ENEMIES.anvil.speed)} u/s`);
  await index.getByRole('button', { name: /Radiant Lag Ring/ }).click();
  await expect(page.getByRole('heading', { name: 'Radiant Lag Ring' })).toBeVisible();
  await expect(page.locator('.enemy-archive-seal b')).toHaveText(archiveNumber('radiant'));
  await expect(page.locator('.enemy-archive-specimen')).toHaveAttribute('data-suppressed-tower', 'false');
  await page.getByRole('button', { name: 'Suppress tower' }).click();
  await expect(page.getByRole('heading', { name: 'Suppressed Tower' })).toBeVisible();
  await expect(page.locator('.enemy-archive-specimen')).toHaveAttribute('data-suppressed-tower', 'true');
  const aura = ENEMIES.radiant.aura;
  if (!aura) throw new Error('Expected the radiant signal to define suppression');
  await expect(page.locator('[data-stat="suppressedCooldown"] strong')).toHaveText(`${formatValue(aura.cooldownMultiplier)}×`);
  await expect(page.locator('[data-stat="suppressedRegen"] strong')).toHaveText(`${Math.round(aura.energyRegenMultiplier * 100)}%`);
  await expect(page.locator('[data-stat="health"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Return to signal' }).click();
  await expect(page.getByRole('heading', { name: 'Radiant Lag Ring' })).toBeVisible();
  const longNameFrameHeight = await consoleFrame.evaluate((element) => element.getBoundingClientRect().height);
  expect(longNameFrameHeight).toBeCloseTo(initialFrameHeight, 0);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: '\u4e2d\u6587' }).click();
  await expect(page.getByRole('heading', { name: /\u4fe1\u53f7\u56fe\u9274/ })).toBeVisible();
  await page.getByRole('button', { name: '\u5173\u95ed\u8bbe\u7f6e' }).click();
  await page.getByRole('button', { name: /\u8fd4\u56de\u9632\u533a\u9009\u62e9/ }).click();
  await expect(page.getByRole('region', { name: /\u9009\u62e9\u9632\u5fa1\u533a/ })).toBeVisible();
});

test('creative economy and signal controls are independent from the workshop', async ({ page }) => {
  await prepareReturningPlayer(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Creative/ }).click();
  await expect(page.getByRole('heading', { name: 'Creative Run Calibration' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Creative .* Start deployment/ })).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Core stability' }).fill('35');
  await page.getByRole('spinbutton', { name: 'Wave count' }).fill('5');
  await page.getByRole('button', { name: /Start deployment/ }).click();

  await expect(page.getByText('∞', { exact: true })).toBeVisible();
  await expect(page.locator('.core-metric strong')).toHaveText('35/35');
  await expect(page.locator('.wave-metric strong')).toHaveText('0/5');
  const signalButton = page.getByRole('button', { name: 'Signal console' });
  await expect(signalButton).toBeVisible();
  await signalButton.click();
  const signalConsole = page.getByRole('dialog', { name: 'Creative Signal Console' });
  await expect(signalConsole).toBeVisible();
  await page.locator('.battle-footer-state').click();
  await expect(signalConsole).toHaveCount(0);

  await signalButton.click();
  await page.getByRole('button', { name: 'Close signal console' }).click();
  await expect(signalConsole).toHaveCount(0);

  await clickBattlefieldAt(page, towerPad(defaultLevel, 0));
  await expect(page.getByLabel('Tower module workshop').locator('.creative-lab')).toHaveCount(0);
});

test('level carousel keeps three cards visible and launches the beginner map', async ({ page }) => {
  test.slow();
  await prepareReturningPlayer(page);
  await page.goto('/');
  const levelGroup = page.getByRole('radiogroup', { name: 'Choose defense sector' });
  await expect(levelGroup.getByRole('radio')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: /Launch Elbow/ })).toBeVisible();

  await page.getByRole('button', { name: 'Show next levels' }).click();
  await expect(levelGroup.getByRole('radio')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: /Verdant Fold/ })).toBeVisible();
  await page.getByRole('button', { name: 'Show previous levels' }).click();

  await page.getByRole('radio', { name: /Launch Elbow/ }).click();
  await page.getByRole('button', { name: /Start deployment/ }).click();
  await expect(page.getByRole('heading', { name: 'Launch Elbow T-0', level: 1 })).toBeVisible();
  const tutorial = page.getByRole('region', { name: 'Launch Elbow tutorial' });
  await expect(tutorial.getByRole('heading', { name: 'Welcome to Launch Elbow' })).toBeVisible();
  const tutorialCard = tutorial.locator('.tutorial-card');
  const initialCardBox = await tutorialCard.boundingBox();
  const dragHandleBox = await tutorial.getByRole('button', { name: 'Move tutorial panel' }).boundingBox();
  if (!initialCardBox || !dragHandleBox) throw new Error('Expected a draggable tutorial card');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a viewport');
  expect(initialCardBox.x + initialCardBox.width / 2).toBeCloseTo(viewport.width / 2, 0);
  expect(initialCardBox.y + initialCardBox.height / 2).toBeCloseTo(viewport.height / 2, 0);
  await page.mouse.move(dragHandleBox.x + dragHandleBox.width / 2, dragHandleBox.y + dragHandleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragHandleBox.x + dragHandleBox.width / 2, dragHandleBox.y - 90, { steps: 5 });
  await page.mouse.up();
  const movedCardBox = await tutorialCard.boundingBox();
  expect(movedCardBox?.x ?? 0).toBeCloseTo(initialCardBox.x, 0);
  expect(movedCardBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(initialCardBox.y - 30);
  await tutorial.getByRole('button', { name: 'Begin calibration' }).click();
  const cornerCardBox = await tutorialCard.boundingBox();
  if (!cornerCardBox) throw new Error('Expected the tutorial card in the lower-right corner');
  expect(viewport.width - cornerCardBox.x - cornerCardBox.width).toBeCloseTo(20, 0);
  expect(viewport.height - cornerCardBox.y - cornerCardBox.height).toBeCloseTo(20, 0);
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
  await expect(tutorialCard).toContainText('Observe the module combination');
  const waveCardBox = await tutorialCard.boundingBox();
  if (!waveCardBox) throw new Error('Expected the standard tutorial card during wave one');
  expect(viewport.width - waveCardBox.x - waveCardBox.width).toBeCloseTo(20, 0);
  expect(viewport.height - waveCardBox.y - waveCardBox.height).toBeCloseTo(20, 0);
  await page.getByRole('button', { name: '2×' }).click();
  await clickBattlefieldAt(page, towerPad(tutorialLevel, 1));
  await expect(workshop.locator('.tower-id')).toHaveText('Node 02');
  await expect(tutorial.getByRole('heading', { name: 'This is not the tutorial tower' })).toBeVisible({ timeout: 45_000 });
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
  await page.evaluate((key) => localStorage.removeItem(key), TUTORIAL_OFFER_STORAGE_KEY);
  await tutorial.getByRole('button', { name: 'Click “Launch signal” to finish the tutorial' }).click();
  await expect(tutorial).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), TUTORIAL_OFFER_STORAGE_KEY)).toBe('1');
});
