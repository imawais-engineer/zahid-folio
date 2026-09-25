#!/bin/sh
# Build the portfolio inside a Node 22 container.
# The VPS host Node (18) is too old for rolldown/vite 8; the Docker build
# already uses node:22-alpine, so local verification uses the same image.
set -e
docker run --rm \
  -v /opt/zahid-folio:/app -w /app \
  -v /opt/zahid-folio/node_modules:/app/node_modules \
  node:22-alpine sh -c "NITRO_PRESET=node-server npm run build"
