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
# railway.json 은 이 서비스에 적용되지 않는다(배포 manifest 의 configFile·preDeployCommand 가 비어 있음).
# 그래서 시작할 때 마이그레이션한다. 실패해도 서버는 띄운다: 관리자 화면은 DB 없이 동작하고 회원 기능만 fail-closed 된다.
CMD ["sh", "-c", "prisma migrate deploy --config web/prisma.config.ts || echo '[migrate] prisma migrate deploy failed' >&2; exec node web/server.js"]
