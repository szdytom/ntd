export interface CoopServerConfig {
  host: string;
  port: number;
  combatWorkerCount: number;
  combatQueueLimit: number;
  maxRooms: number;
  maxConnections: number;
}

const integerSetting = (
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number => {
  const raw = environment[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be an integer`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}`);
  }
  return value;
};

export function readCoopServerConfig(environment: NodeJS.ProcessEnv = process.env): CoopServerConfig {
  const host = environment.COOP_HOST?.trim() || '0.0.0.0';
  return {
    host,
    port: integerSetting(environment, 'COOP_SERVER_PORT', 4174, 0, 65_535),
    combatWorkerCount: integerSetting(environment, 'COOP_COMBAT_WORKERS', 1, 1, 64),
    combatQueueLimit: integerSetting(environment, 'COOP_COMBAT_QUEUE_LIMIT', 128, 1, 100_000),
    maxRooms: integerSetting(environment, 'COOP_MAX_ROOMS', 64, 1, 10_000),
    maxConnections: integerSetting(environment, 'COOP_MAX_CONNECTIONS', 256, 2, 100_000),
  };
}
