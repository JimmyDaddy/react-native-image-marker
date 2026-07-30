FROM node:22-bookworm-slim AS package-builder

WORKDIR /workspace
COPY package.json package-lock.json babel.config.js tsconfig.json tsconfig.build.json ./
COPY packages/cli/package.json packages/cli/package.json
COPY packages/editor/package.json packages/editor/package.json
COPY packages/node/package.json packages/node/package.json
COPY packages/recipe/package.json packages/recipe/package.json
COPY packages/recipe/recipe.schema.json packages/recipe/recipe.schema.json
COPY packages/recipe/tsconfig.commonjs.json packages/recipe/tsconfig.commonjs.json
COPY packages/recipe/tsconfig.module.json packages/recipe/tsconfig.module.json
COPY packages/recipe/src packages/recipe/src
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
