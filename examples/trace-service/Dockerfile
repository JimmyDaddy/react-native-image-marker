FROM node:22-bookworm-slim AS package-builder

WORKDIR /workspace
COPY package.json package-lock.json babel.config.js tsconfig.json tsconfig.build.json ./
COPY trace-runtime.js ./
COPY scripts ./scripts
COPY src ./src
RUN npm ci && npm run prepack

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /workspace/examples/trace-service
COPY examples/trace-service/package.json examples/trace-service/package-lock.json ./
RUN npm ci --omit=dev
COPY examples/trace-service/src ./src
COPY --from=package-builder /workspace/lib /workspace/lib
COPY --from=package-builder /workspace/trace-runtime.js /workspace/trace-runtime.js

USER node
ENV HOST=0.0.0.0
ENV PORT=8787
EXPOSE 8787
CMD ["node", "src/server.mjs"]
