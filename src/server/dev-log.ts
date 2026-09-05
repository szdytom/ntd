const enabled = process.env.COOP_DEV_LOG === '1';

type LogDetails = Readonly<Record<string, unknown>>;

const write = (level: 'info' | 'warn' | 'error', event: string, details: LogDetails): void => {
  if (!enabled && level !== 'error') return;
  const entry = JSON.stringify({
    time: new Date().toISOString(),
    level,
    event,
    ...details,
  });
  const output = level === 'info' ? process.stdout : process.stderr;
  output.write(`[coop:${enabled ? 'dev' : 'server'}] ${entry}\n`);
};

export const coopDevLog = (event: string, details: LogDetails = {}): void => write('info', event, details);
export const coopDevWarn = (event: string, details: LogDetails = {}): void => write('warn', event, details);
export const coopDevError = (event: string, details: LogDetails = {}): void => write('error', event, details);
