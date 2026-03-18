FROM node:20-alpine AS build
WORKDIR /app

# Install portfolio dependencies
COPY package*.json ./
RUN npm ci

# Copy full source
COPY . .

# Build portfolio + all games
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

COPY server/package*.json ./server/
RUN npm ci --omit=dev --prefix ./server

COPY --from=build /app/dist ./dist
COPY server ./server

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]
