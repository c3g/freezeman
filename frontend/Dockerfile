FROM node:15 as builder

WORKDIR /data/freezeman/frontend/

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

VOLUME [ "/data/freezeman/frontend/dist" ]