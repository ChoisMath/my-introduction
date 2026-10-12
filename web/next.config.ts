import path from 'node:path';
import type { NextConfig } from 'next';

// `npm run build -w web` 은 cwd 가 web/ 이다.
const repoRoot = path.resolve(process.cwd(), '..');

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  trailingSlash: true,
  // Google OAuth 콜백과 스트림 본문 PUT 은 308 리다이렉트를 따라가지 못하므로 슬래시 리다이렉트를 끈다.
  skipTrailingSlashRedirect: true,
  images: { unoptimized: true },
  // content 워크스페이스는 TS 소스 그대로 import 한다.
  transpilePackages: ['@me/content'],
  turbopack: { root: repoRoot },
  agentRules: false,
  // 예전 모션 챕터 주소(공유 링크·검색 결과)는 AI활용 허브로 영구 이동한다. 구체 규칙이 먼저다.
  async redirects() {
    return [
      { source: '/motion/admin/viewers/', destination: '/ai/admin/members/', permanent: true },
      { source: '/motion/signin-error/', destination: '/ai/signin-error/', permanent: true },
      { source: '/motion', destination: '/ai/motion/', permanent: true },
      { source: '/motion/', destination: '/ai/motion/', permanent: true },
      { source: '/motion/:path+/', destination: '/ai/motion/:path+/', permanent: true },
    ];
  },
};

export default nextConfig;
