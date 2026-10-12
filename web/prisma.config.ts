import { existsSync } from 'node:fs';
import path from 'node:path';
import type { PrismaConfig } from 'prisma';

// 런타임 이미지는 전역 설치한 prisma CLI 로 migrate deploy 를 돌린다. 그 위치에서는 'prisma/config' 를
// resolve 할 수 없으므로 defineConfig 대신 타입 전용 import 와 평범한 객체를 쓴다.
const localEnv = path.join(import.meta.dirname, '.env.local');
if (!process.env.DATABASE_URL && existsSync(localEnv)) process.loadEnvFile(localEnv);

export default {
  schema: path.join(import.meta.dirname, 'prisma/schema.prisma'),
  migrations: { path: path.join(import.meta.dirname, 'prisma/migrations') },
  // generate 는 URL 이 필요 없으므로 빌드(DATABASE_URL 없음)에서 실패하지 않게 빈 값을 허용한다.
  datasource: { url: process.env.DATABASE_URL ?? '' },
} satisfies PrismaConfig;
