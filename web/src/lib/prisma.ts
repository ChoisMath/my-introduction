import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

// pg 기본값은 연결 대기 무제한이라, DB 가 응답하지 않으면 열람자 요청·Google 로그인 콜백이 몇 분씩 멈춘다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: url, connectionTimeoutMillis: 5_000 }) });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
