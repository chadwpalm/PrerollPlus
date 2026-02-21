FROM node:20-slim AS frontend-builder
WORKDIR /app
ENV GENERATE_SOURCEMAP=false
ENV NODE_ENV=production
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
RUN cd frontend && npm run build

FROM node:20-slim
ARG BUILD
ENV BUILD=${BUILD}
EXPOSE 4949
WORKDIR /app
COPY app.js ./
COPY version.json ./
COPY package*.json ./
COPY --from=frontend-builder /app/frontend/production ./frontend/production
RUN npm ci --production --no-audit --no-fund
COPY backend ./backend
COPY bin ./bin
COPY webhook ./webhook
HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=10s \
    --retries=3 \
    CMD node -e "require('http').get('http://localhost:4949', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["npm", "start"]
