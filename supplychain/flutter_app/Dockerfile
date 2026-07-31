# Stage 1: Build Flutter Web
FROM ghcr.io/cirrusci/flutter:3.24.0 AS builder

WORKDIR /app

# Copy dependency files and install
COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

# Copy source files and build web app
COPY . .
RUN flutter build web --release

# Stage 2: Serve Web App using Lightweight Nginx
FROM nginx:alpine

# Default PORT environment variable
ENV PORT=80

# Copy Nginx configuration template (Nginx automatically populates $PORT via envsubst)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy built static files from builder stage
COPY --from=builder /app/build/web /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
