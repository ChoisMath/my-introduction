# Railway 빌드: video 워크스페이스(Remotion)는 설치하지 않는다.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY content/package.json content/
COPY web/package.json web/
COPY video/package.json video/
RUN npm ci -w content -w web --include-workspace-root
COPY content content
COPY scripts scripts
COPY web web
RUN npm run build:web

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0
# Railway preDeployCommand(prisma migrate deploy)용 CLI. 마이그레이션 엔진이 libssl 을 찾으므로 openssl 을 먼저 설치한다.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* \
  && npm i -g prisma@7.10.0 && npm cache clean --force
COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/prisma.config.ts web/prisma.config.ts
COPY --from=build /app/web/prisma web/prisma
CMD ["node", "web/server.js"]
