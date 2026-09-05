import { fileURLToPath } from 'node:url';
import { register } from 'tsx/esm/api';

// The solution tsconfig has no source files; reports need the shared JSX and path settings.
register({ tsconfig: fileURLToPath(new URL('../tsconfig.base.json', import.meta.url)) });
