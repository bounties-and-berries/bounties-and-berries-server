FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"] 