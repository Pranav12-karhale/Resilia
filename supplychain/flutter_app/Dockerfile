# Stage 1: Build Flutter Web
FROM ubuntu:22.04 AS builder

# Install dependencies for Flutter
RUN apt-get update && \
    apt-get install -y curl git unzip xz-utils zip libglu1-mesa

# Create a non-root user
RUN useradd -ms /bin/bash flutteruser
USER flutteruser
WORKDIR /home/flutteruser

# Download and install Flutter (stable channel)
RUN git clone https://github.com/flutter/flutter.git -b stable flutter
ENV PATH="/home/flutteruser/flutter/bin:/home/flutteruser/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Enable web support
RUN flutter config --enable-web

WORKDIR /app

# Copy files with correct ownership
COPY --chown=flutteruser:flutteruser . .

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
