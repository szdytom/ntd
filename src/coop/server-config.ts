declare const __PRISM_BASTION_COOP_SERVERS__: Readonly<Record<string, string>> | undefined;
declare const __PRISM_BASTION_COOP_ALLOW_SERVER_OVERRIDE__: boolean | undefined;

export interface CoopServerLocation {
  readonly search: string;
  readonly protocol: string;
  readonly hostname: string;
}

const configuredServers = typeof __PRISM_BASTION_COOP_SERVERS__ === 'undefined'
  ? {}
  : __PRISM_BASTION_COOP_SERVERS__;
const allowServerOverride = typeof __PRISM_BASTION_COOP_ALLOW_SERVER_OVERRIDE__ !== 'undefined'
  && __PRISM_BASTION_COOP_ALLOW_SERVER_OVERRIDE__;

const isWebSocketUrl = (value: string): boolean => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'ws:' || protocol === 'wss:';
  } catch {
    return false;
  }
};

export function resolveCoopServerUrl(
  location: CoopServerLocation,
  servers: Readonly<Record<string, string>> = configuredServers,
  allowArbitraryUrl = allowServerOverride,
): string {
  const selection = new URLSearchParams(location.search).get('server');
  if (selection) {
    const configured = Object.hasOwn(servers, selection) ? servers[selection] : undefined;
    if (configured) return configured;
    if (allowArbitraryUrl && isWebSocketUrl(selection)) return selection;
  }
  const firstConfigured = Object.values(servers)[0];
  if (firstConfigured) return firstConfigured;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.hostname}:4174`;
}

export function currentCoopServerUrl(): string {
  return resolveCoopServerUrl({
    search: globalThis.location.search,
    protocol: globalThis.location.protocol,
    hostname: globalThis.location.hostname,
  });
}

export function isValidStoredServerUrl(value: unknown): value is string {
  return typeof value === 'string' && isWebSocketUrl(value);
}
