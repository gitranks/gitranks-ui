FROM node:25-alpine AS base

# For some reason nextjs tries to run the /lib/mongo-client.ts file at build time
# and the build fails because this variable is not set
# this must be understood and fixed in the future
# for now just make nextjs happy by setting this variable
ENV MONGODB_URI_AUTH=mongodb://localhost:27020/auth

ARG NEXT_PUBLIC_URI
ENV NEXT_PUBLIC_URI=$NEXT_PUBLIC_URI

FROM base AS deps
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g corepack@latest
RUN corepack enable && corepack prepare pnpm@10 --activate
RUN pnpm i --frozen-lockfile

FROM base AS builder
ARG INTERNAL_JWT_SECRET
ENV INTERNAL_JWT_SECRET=$INTERNAL_JWT_SECRET

ARG URI_GITRANKS
ENV URI_GITRANKS=$URI_GITRANKS

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g corepack@latest
RUN corepack enable && corepack prepare pnpm@10 --activate
RUN pnpm build
 
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy and set up the profile cache cleaner script
COPY --chown=nextjs:nodejs lib/shell/profile-cache-cleaner.sh /app/lib/shell/profile-cache-cleaner.sh
RUN chmod +x /app/lib/shell/profile-cache-cleaner.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start both the cache cleaner (in background) and the node server (in foreground)
# Background process output will appear in docker logs
CMD ["sh", "-c", "/app/lib/shell/profile-cache-cleaner.sh 2>&1 & exec node server.js"]