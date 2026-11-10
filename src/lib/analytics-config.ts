// @ts-ignore: plain JS module shared with the serverless functions
import { POSTHOG_KEY } from '../../lib/posthog-key.js';

export const analytics = {
  /** PostHog project key, shared with fhsystems.dev. Public by design (write-only). */
  key: POSTHOG_KEY as string,
  /** Same-origin reverse proxy (vercel.json rewrites), so ad blockers don't drop events by hostname. */
  ingestPath: '/ingest',
  uiHost: 'https://eu.posthog.com',
  /** Only the live site reports; localhost and Vercel preview hosts stay silent. */
  reportFromHost: 'tours.fhsystems.dev',
} as const;
