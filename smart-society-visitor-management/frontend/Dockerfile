# Stage 1: build the Angular app
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npx ng build --configuration production

# Stage 2: serve over HTTP, HTTPS-ready (mount certs to enable 443)
FROM nginx:alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/smart-society-frontend/browser /usr/share/nginx/html
EXPOSE 80 443
