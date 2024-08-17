FROM node:18.15.0-slim

ARG BUILD

ENV BUILD=${BUILD}

COPY . /PrerollPlus

WORKDIR /PrerollPlus/frontend

RUN npm ci && npm run build

WORKDIR /PrerollPlus

RUN npm ci

ENTRYPOINT ["npm", "start"]
