FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY telemetry-sim.js .
CMD ["node", "telemetry-sim.js"]
