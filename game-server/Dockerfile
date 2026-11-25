# Depths of Darkness game server: small Node.js image, no npm packages needed.
# Build and run with docker compose (see docker-compose.yml and README.md).
FROM node:24-alpine

ENV NODE_ENV=production \
    PORT=4100 \
    HOST=0.0.0.0 \
    DATA_DIR=/data

WORKDIR /app
COPY server.mjs admin.mjs ./

# Accounts and saves live in /data (a Docker volume), owned by the unprivileged "node" user.
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 4100

# Docker marks the container unhealthy if the server stops answering.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4100)+'/api/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--no-warnings", "server.mjs"]
