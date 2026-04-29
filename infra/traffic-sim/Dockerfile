FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY traffic-sim.js .
CMD ["node", "traffic-sim.js"]
