FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY . .

ENV NODE_ENV=production
ENV PORT=8029

EXPOSE 8029

CMD ["npm", "start"]
