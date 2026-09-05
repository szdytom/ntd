// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@prism-bastion/web-shared/i18n';
import { MobileFullscreenButton } from '@prism-bastion/web-shared/ui/MobileFullscreenButton';

const fullscreenDescriptor = Object.getOwnPropertyDescriptor(document.documentElement, 'requestFullscreen');
const orientationDescriptor = Object.getOwnPropertyDescriptor(globalThis.screen, 'orientation');
const touchPointsDescriptor = Object.getOwnPropertyDescriptor(navigator, 'maxTouchPoints');

const restoreProperty = (target: object, key: PropertyKey, descriptor: PropertyDescriptor | undefined): void => {
  if (descriptor) Object.defineProperty(target, key, descriptor);
  else Reflect.deleteProperty(target, key);
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  restoreProperty(document.documentElement, 'requestFullscreen', fullscreenDescriptor);
  restoreProperty(globalThis.screen, 'orientation', orientationDescriptor);
  restoreProperty(globalThis.navigator, 'maxTouchPoints', touchPointsDescriptor);
});

describe('mobile fullscreen button', () => {
  it('stays hidden without supported mobile fullscreen', () => {
    render(<MobileFullscreenButton />);
    expect(screen.queryByRole('button', { name: 'Enter fullscreen' })).toBeNull();
  });

  it('attempts orientation even when fullscreen fails and reports both errors', async () => {
    const requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'));
    const lock = vi.fn().mockRejectedValue(new Error('unavailable'));
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query === '(pointer: coarse)' || query === '(hover: none)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    } satisfies MediaQueryList)));
    Object.defineProperty(globalThis.navigator, 'maxTouchPoints', { configurable: true, value: 1 });
    Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: requestFullscreen });
    Object.defineProperty(globalThis.screen, 'orientation', { configurable: true, value: { lock } });
    const user = userEvent.setup();
    render(<MobileFullscreenButton />);

    await user.click(screen.getByRole('button', { name: 'Enter fullscreen' }));

    await waitFor(() => expect(lock).toHaveBeenCalledWith('landscape'));
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert').textContent).toContain('Fullscreen could not be started.');
    expect(screen.getByRole('alert').textContent).toContain('Landscape orientation could not be enabled.');
  });
});
