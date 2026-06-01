FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npx storybook build -o storybook-static

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/storybook-static /usr/share/nginx/html/story
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
