// analytics.ts — POZ-DEV-347 Analytics event taksonomisi
import { log } from '../utils/logger';

export type AnalyticsEvent =
  | { type: 'screen_view'; screen: string; params?: Record<string, unknown> }
  | { type: 'action'; name: string; target?: string; value?: unknown }
  | { type: 'error'; code: string; message: string; screen?: string }
  | { type: 'business'; name: string; data?: Record<string, unknown> };

type Sink = (event: AnalyticsEvent, ts: number) => void;

const sinks: Sink[] = [];
let enabled = true;

export function setAnalyticsEnabled(v: boolean): void {
  enabled = v;
}

export function addAnalyticsSink(sink: Sink): () => void {
  sinks.push(sink);
  return () => {
    const i = sinks.indexOf(sink);
    if (i >= 0) sinks.splice(i, 1);
  };
}

export function track(event: AnalyticsEvent): void {
  if (!enabled) return;
  const ts = Date.now();
  log.debug(`analytics:${event.type}`, { module: 'analytics', data: event });
  for (const sink of sinks) {
    try {
      sink(event, ts);
    } catch {
      // sessiz
    }
  }
}

// Hızlı yardımcılar
export const analytics = {
  screen: (screen: string, params?: Record<string, unknown>) => track({ type: 'screen_view', screen, params }),
  action: (name: string, target?: string, value?: unknown) => track({ type: 'action', name, target, value }),
  error: (code: string, message: string, screen?: string) => track({ type: 'error', code, message, screen }),
  business: (name: string, data?: Record<string, unknown>) => track({ type: 'business', name, data }),
};
