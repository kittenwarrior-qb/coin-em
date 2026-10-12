FROM node:22.23.3-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEBUG_ROLE_PICKER=false
RUN npm run build

FROM caddy:2-alpine
COPY --from=builder /app/dist /srv
