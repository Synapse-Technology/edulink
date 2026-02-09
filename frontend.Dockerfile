# Frontend Dockerfile
FROM node:20-slim as builder
WORKDIR /app
COPY edulink-frontend/package*.json ./
RUN npm install
COPY edulink-frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy a simple nginx config for SPA routing
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
