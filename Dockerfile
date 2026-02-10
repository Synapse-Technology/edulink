# Simple Dockerfile for Edulink Informational Website
FROM nginx:stable-alpine

# Copy the informational website content to Nginx's public directory
COPY Edulink_website/ /usr/share/nginx/html/

# Optional: Add a custom nginx config if needed for better routing
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Nginx starts automatically by default in the official image
CMD ["nginx", "-g", "daemon off;"]
