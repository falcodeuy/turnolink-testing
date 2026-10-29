import type { Page } from '@playwright/test';

/**
 * Dismiss non-essential UI that steals clicks. Absence must never fail the test.
 * Call from helpers (launch/auth/journey), not from specs.
 */
export async function dismissHelpModalIfPresent(page: Page): Promise<void> {
  const close = page.getByRole('button', { name: 'cerrar' });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

/** Post-onboarding / dashboard referral nudge. */
export async function dismissReferralNudgeIfPresent(page: Page): Promise<void> {
  const dismiss = page.getByRole('button', { name: 'Ahora no' });
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
    await dismiss.waitFor({ state: 'hidden' }).catch(() => undefined);
  }
}

/**
 * Local Next.js issue badge / portal can intercept clicks on tabs and CTAs.
 * Dev overlays may reappear after each navigation — call before critical clicks.
 */
export async function dismissNextjsPortalIfPresent(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('nextjs-portal').forEach((node) => node.remove());
  });
}

/** Common blockers before primary actions on either app. */
export async function dismissNonEssentialOverlays(page: Page): Promise<void> {
  await dismissNextjsPortalIfPresent(page);
  await dismissHelpModalIfPresent(page);
  await dismissReferralNudgeIfPresent(page);
}
