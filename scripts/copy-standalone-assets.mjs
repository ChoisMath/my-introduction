// standalone 출력에는 public/ 과 .next/static/ 이 빠져 있어 server.js 옆으로 복사해야 서빙된다.
import { cpSync } from 'node:fs';
import path from 'node:path';

const web = path.resolve(import.meta.dirname, '../web');
const out = path.join(web, '.next/standalone/web');
cpSync(path.join(web, 'public'), path.join(out, 'public'), { recursive: true });
cpSync(path.join(web, '.next/static'), path.join(out, '.next/static'), { recursive: true });
console.info('standalone assets copied');
