import { test, expect } from '../../fixtures/e2e';

test.describe('@screen e2e lease lifecycle', () => {
  test('begin / trackName / end fixture tears down without UI', async ({
    e2e,
    localWrites: _localWrites,
  }) => {
    expect(e2e.runId).toMatch(/^w\d+-r\d+-/);
    expect(e2e.company.slug).toBeTruthy();
    e2e.trackName(`E2E Lease ${e2e.runId}`);
    const noop = e2e.factory('noop');
    expect(noop.factory).toBe('noop');
  });
});
