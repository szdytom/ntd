import { execFileSync } from 'node:child_process';

const gitValue = (format) => {
  try {
    return execFileSync('git', ['log', '-1', `--format=${format}`], { encoding: 'utf8' }).trim();
  } catch {
    return 'development';
  }
};

export const getBuildInfo = () => ({
  commitDate: gitValue('%cs'),
  commit: gitValue('%h'),
});
