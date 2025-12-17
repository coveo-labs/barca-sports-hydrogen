const LOG_PREFIX = '[assistant]';

const isDev = (() => {
  try {
    if (typeof import.meta !== 'undefined') {
      const meta = import.meta as ImportMeta & {env?: {DEV?: boolean}};
      if (meta.env && typeof meta.env.DEV !== 'undefined') {
        return Boolean(meta.env.DEV);
      }
    }
  } catch (error) {
    // ignore - falls through to process check
  }

  if (typeof process !== 'undefined' && process?.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }

  return true;
})();

function log(method: 'debug' | 'info' | 'warn' | 'error', message: string, payload?: unknown) {
  const shouldLog = method === 'error' || method === 'warn' ? true : isDev;
  if (!shouldLog) {
    return;
  }

  const args = payload === undefined ? [LOG_PREFIX, message] : [LOG_PREFIX, message, payload];
  const target = console[method] ?? console.log;
  target(...args);
}

export function logDebug(message: string, payload?: unknown) {
  log('debug', message, payload);
}

export function logInfo(message: string, payload?: unknown) {
  log('info', message, payload);
}

export function logWarn(message: string, payload?: unknown) {
  log('warn', message, payload);
}

export function logError(message: string, payload?: unknown) {
  log('error', message, payload);
}
