import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../web/e2e/.volume');
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
console.info(`e2e volume ready: ${root}`);
