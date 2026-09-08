FROM node:22-alpine AS build

WORKDIR /app
RUN apk add --no-cache poppler-utils unzip
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
