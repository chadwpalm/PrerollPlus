FROM node:26-alpine AS frontend-builder
WORKDIR /app
# NODE_ENV is not set to production here: npm ci needs the Vite devDependencies to build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --no-audit --no-fund
COPY frontend ./frontend
RUN cd frontend && npm run build

FROM node:26-alpine
ARG BUILD
ENV BUILD=${BUILD}
ENV NODE_ENV=production
EXPOSE 4949
WORKDIR /app
# Time zone data so the TZ environment variable works (daily sequence change, holidays)
RUN apk add --no-cache tzdata
COPY app.js ./
COPY version.json ./
COPY nodemon.json ./
COPY package*.json ./
COPY --from=frontend-builder /app/frontend/production ./frontend/production
# Install production dependencies, then remove npm/yarn: they are not needed at runtime and
# their bundled packages are a common source of reported vulnerabilities
RUN npm ci --omit=dev --no-audit --no-fund \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
    /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg /root/.npm
COPY backend ./backend
COPY bin ./bin
COPY webhook ./webhook
COPY feed ./feed
HEALTHCHECK \
    --interval=30s \
    --timeout=5s \
    --start-period=10s \
    --retries=3 \
    CMD node bin/healthcheck.js

# Run nodemon directly (same as `npm start`) so signals reach the app without npm in between
ENTRYPOINT ["node", "node_modules/nodemon/bin/nodemon.js", "./bin/www"]
