// logger.ts — POZ-DEV-346 Merkezi logger (console.warn -> log)
import { Platform } from 'react-native';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  module?: string;
  data?: unknown;
}

type LogSink = (level: LogLevel, msg: string, ctx?: LogContext) => void;

const sinks: LogSink[] = [];
let minLevel: LogLevel = __DEV__ ? 'debug' : 'warn';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

export function addLogSink(sink: LogSink): () => void {
  sinks.push(sink);
  return () => {
    const i = sinks.indexOf(sink);
    if (i >= 0) sinks.splice(i, 1);
  };
}

function shouldEmit(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function emit(level: LogLevel, msg: string, ctx?: LogContext) {
  if (!shouldEmit(level)) return;
  const prefix = ctx?.module ? `[${ctx.module}]` : '';
  // Console fallback
  /* eslint-disable no-console */
  if (level === 'error') console.error(prefix, msg, ctx?.data ?? '');
  else if (level === 'warn') console.warn(prefix, msg, ctx?.data ?? '');
  else if (level === 'info') console.info(prefix, msg, ctx?.data ?? '');
  else if (__DEV__) console.log(prefix, msg, ctx?.data ?? '');
  /* eslint-enable no-console */
  for (const sink of sinks) {
    try {
      sink(level, msg, ctx);
    } catch {
      // sessiz
    }
  }
}

export const log = {
  debug: (msg: string, ctx?: LogContext) => emit('debug', msg, ctx),
  info: (msg: string, ctx?: LogContext) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit('error', msg, ctx),
};

export const platformInfo = {
  os: Platform.OS,
  version: Platform.Version,
};
