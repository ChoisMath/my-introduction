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
COPY --from=build /app/web/.next/standalone ./
CMD ["node", "web/server.js"]
