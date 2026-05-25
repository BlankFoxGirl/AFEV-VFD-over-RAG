FROM node:24-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV MONGODB_URI=mongodb://placeholder/appdb
RUN npm run build

FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["tail", "-f", "/dev/null"]

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
USER nextjs
EXPOSE 3001
CMD ["npm", "start"]
