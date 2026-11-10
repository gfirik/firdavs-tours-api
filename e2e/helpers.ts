import type { Page } from '@playwright/test';

export const PLANNER = 'https://ig63smceaks7.run.agentplace.io';

/**
 * Replace the real planner with a stub that speaks the same parent protocol:
 * posts "SYN", accepts "ACK" + MessagePort, ACKs `agent.message.send` notifications
 * and shows the received text. `ack: false` simulates a planner that never confirms;
 * `down: true` an unavailable one.
 */
export async function stubPlanner(page: Page, { ack = true, down = false } = {}) {
  // `down: true` behaves like the outage: an error page that never sends SYN.
  if (down) {
    await page.route(`${PLANNER}/**`, (route) => route.fulfill({ status: 502, contentType: 'text/html', body: '<!doctype html><title>502</title><p>Bad gateway</p>' }));
    return;
  }
  await page.route(`${PLANNER}/**`, (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0d162b;color:#f3ede0;font:16px sans-serif">
<p id="got">waiting</p>
<script>
addEventListener('message', function (e) {
  if (e.data !== 'ACK' || !e.ports[0]) return;
  var port = e.ports[0];
  port.onmessage = function (m) {
    var d = m.data || {};
    if (d.type === 'NOTIFY' && d.payload && d.payload.type === 'agent.message.send') {
      document.getElementById('got').textContent = d.payload.message;
      ${ack ? "port.postMessage({ id: d.id, type: 'ACK' });" : ''}
    }
  };
  port.start();
});
setTimeout(function () { parent.postMessage('SYN', '*'); }, 300);
</script>`,
    }),
  );
}

export const plannerText = (page: Page) => page.frameLocator('#planner').locator('#got');
