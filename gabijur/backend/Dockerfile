# Dockerfile para backend Node.js/Express do GabiJur
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 8000
CMD ["npm", "start"] 