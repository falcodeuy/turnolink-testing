import type { ConsoleMessage, Page } from '@playwright/test';
import { expect } from '@playwright/test';

const REACT_CONSOLE_ERROR =
  /value prop on `?input`? should not be null|uncontrolled input to be controlled|cannot be a descendant of|cannot contain a nested/i;

/**
 * Collect React/DOM console errors for the page lifetime.
 * Call as early as possible (before navigations under test).
 */
export function attachReactConsoleGuard(page: Page): {
  errors: string[];
  assertClean: () => void;
} {
  const errors: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (REACT_CONSOLE_ERROR.test(text)) {
      errors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    const text = err.message;
    if (REACT_CONSOLE_ERROR.test(text)) {
      errors.push(text);
    }
  });

  return {
    errors,
    assertClean: () => {
      expect(errors, `React/DOM console errors:\n${errors.join('\n')}`).toEqual(
        [],
      );
    },
  };
}
