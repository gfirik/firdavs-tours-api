# Hero → planner handoff

**Goal:** a traveller types a question (or taps a starter chip or a tour card) on `/`, lands on `/plan`, and the planner already has that question, with no retyping.

The planner is hosted on Agentplace at `https://ig63smceaks7.run.agentplace.io` and runs cross-origin inside `/plan`. We can't touch its DOM, so the handoff depends on what the planner itself exposes. The four options were tested in order on 2026-11-06 against the published planner (bundle `main.js?v=8`).

## 1. Agentplace embed script: not usable

- `https://agentplace.io/admin/webui/v1.js` (and `/webui/v1.js`) return Agentplace's "Page not found" page (HTTP 403, HTML). The loader isn't publicly served.
- The planner host does serve `/embed.js`, a second bundle (`src/app/embed/*`). It refuses to start unless it's opened by that loader: it throws `"Open this assistant from its website installation"` without `?parentOrigin=` and `?instance=`. It renders a **floating dock/launcher widget** (`entry: "input" | "compact" | "voice"`) that expands as an overlay, and it takes `initialize / open / close / sendMessage / setContext` commands from the loader.
- Result: no public loader, and the widget is an overlay rather than a full page. The text-input control can't live on our page.

## 2. URL parameter: not supported

The full-screen app reads only these from the URL: `agent_session_id` (resume a session), `gallery`, `phone_sim`, `chrome-debug`, and a `#turn` fragment for history. It has no `q`, `message`, `prompt` or prefill parameter.

## 3. postMessage: **works, and this is what ships**

When the app boots inside a frame it creates an `IframeChildAdapter` (built for Agentplace's own builder preview):

1. The child posts the string `"SYN"` to `window.parent`.
2. The parent answers with `"ACK"`, transferring a `MessagePort`.
3. Over that port the two sides speak a small RPC (`RpcPeer`): packets `{ id, type: "REQ" | "RES" | "NOTIFY" | "ACK" | "PING" | "PONG", payload }`.
4. A `NOTIFY` with payload `{ type: "agent.message.send", message }` calls `messagesStore.sendMessage({ instruction: message })`, exactly as if the traveller had typed it. The child replies `{ id, type: "ACK" }`.

Implementation: `src/pages/plan.astro`, the inline head script:

- `/` links to `/plan?q=<text>`. The hero form is a plain `GET` form and the chips and cards are plain links, so it all works without JS.
- `/plan` reads `q`, then immediately `history.replaceState`s it away so a reload never resends.
- It accepts `SYN` only when `event.origin` is the planner origin and `event.source` is our iframe. It posts `ACK` to that exact origin with a fresh `MessageChannel`, sends one `agent.message.send`, and waits for the matching `ACK` id.
- It answers the planner's own `NOTIFY`/`PING` packets so the channel stays healthy.
- `window.__handoff.state` goes `waiting → delivered | failed`, which the tests read.

Verified with a live run in headless Chrome: the planner showed the starter as the first user turn and answered it (`LIVE=1 npm run test:e2e -g "live planner"`).

**Risk:** this is an internal protocol, not a documented API. If Agentplace changes it, delivery fails, and the fallback below takes over automatically.

## 4. Fallback: clipboard hint

If the planner hasn't said `SYN` within 25 s, or doesn't ACK the message within 5 s:

- `/plan` tries `navigator.clipboard.writeText(q)`. If that works it shows a small dismissible hint: "Your trip is copied, paste it with Ctrl+V / ⌘V".
- Browsers usually block clipboard writes without a fresh user gesture. In that case the hint offers a **Copy my question** button instead, and pressing it shows the same message.

Covered by `e2e/smoke.spec.ts` → "falls back to a copy hint when the planner does not confirm".

## Theme

The planner follows the OS colour scheme (`appearance: "auto"`): navy `#0d162b` in dark, cream `#fbf9f4` in light. The parent can't force it (`color-scheme` on the `<iframe>` doesn't change the child's `prefers-color-scheme`), so the whole site follows the OS too. `/plan` paints exactly the planner's background in both schemes and fades the frame in after `load`, so no seam or flash is visible.
