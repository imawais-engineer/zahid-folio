FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

RUN NITRO_PRESET=node-server npm run build


FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# bcrypt ships prebuilt binaries (prebuilds/) covering node:22-alpine (musl);
# copy the package and its runtime deps into the image. `postgres` is needed
# by the CLI tools (scripts/) which run outside the bundled app.
COPY --from=build /app/.output ./.output
COPY --from=build /app/node_modules/bcrypt ./node_modules/bcrypt
COPY --from=build /app/node_modules/node-gyp-build ./node_modules/node-gyp-build
COPY --from=build /app/node_modules/node-addon-api ./node_modules/node-addon-api
COPY --from=build /app/node_modules/postgres ./node_modules/postgres

# CLI tools (admin password reset, migrations) run inside the container and
# apply the same SQL migrations the app embeds.
COPY scripts ./scripts
COPY src/lib/db/migrations ./src/lib/db/migrations

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
