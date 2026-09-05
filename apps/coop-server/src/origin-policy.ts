export interface WebSocketOriginPolicy {
  readonly allowAny: boolean;
  readonly allowedOrigins: ReadonlySet<string>;
  allows(origin: string | undefined): boolean;
}

const normalizeOrigin = (value: string): string => {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`WebSocket origin must use http or https: ${value}`);
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`WebSocket origin must not include credentials, a path, query, or fragment: ${value}`);
  }
  return url.origin;
};

export function createWebSocketOriginPolicy(options: {
  allowedOrigins?: string | undefined;
  allowAny?: boolean | undefined;
}): WebSocketOriginPolicy {
  const allowAny = options.allowAny === true;
  const allowedOrigins = new Set(
    (options.allowedOrigins ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map(normalizeOrigin),
  );
  if (!allowAny && allowedOrigins.size === 0) {
    throw new Error('Set COOP_ALLOWED_ORIGINS to the CDN page origins, or COOP_ALLOW_ANY_ORIGIN=1 for local development');
  }
  return {
    allowAny,
    allowedOrigins,
    allows: (origin) => {
      if (allowAny) return true;
      if (!origin) return false;
      try {
        return allowedOrigins.has(normalizeOrigin(origin));
      } catch {
        return false;
      }
    },
  };
}
