FROM node:18.15.0-slim

ARG BUILD

ARG FILEDIR

ENV BUILD=${BUILD}

ENV FILEDIR=${FILEDIR}

ENV GENERATE_SOURCEMAP=false

COPY . /PrerollPlus

WORKDIR /PrerollPlus/frontend

RUN npm ci && npm run build

WORKDIR /PrerollPlus

RUN npm ci

ENTRYPOINT ["npm", "start"]
