# Stage 1: Build Flutter Web
FROM ubuntu:22.04 AS builder

# Install dependencies for Flutter
RUN apt-get update && \
    apt-get install -y curl git unzip xz-utils zip libglu1-mesa

# Download and install Flutter (stable channel)
RUN git clone https://github.com/flutter/flutter.git -b stable /usr/local/flutter
ENV PATH="/usr/local/flutter/bin:/usr/local/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Enable web support (just in case)
RUN flutter config --enable-web

WORKDIR /app

# Copy files and build
COPY . .
RUN flutter pub get
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
