import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // content 워크스페이스는 TS 소스 그대로 import 한다.
  transpilePackages: ['@me/content'],
  // `npm run build -w web` 은 cwd 가 web/ 이다.
  turbopack: { root: path.resolve(process.cwd(), '..') },
  agentRules: false,
};

export default nextConfig;
