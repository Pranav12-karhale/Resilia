# Stage 1: Build Flutter Web
FROM ubuntu:22.04 AS builder

# Install dependencies for Flutter
RUN apt-get update && \
    apt-get install -y curl git unzip xz-utils zip libglu1-mesa && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user with a home directory and app directory
RUN useradd -ms /bin/bash flutteruser && \
    mkdir -p /home/flutteruser/app && \
    chown -R flutteruser:flutteruser /home/flutteruser

USER flutteruser
WORKDIR /home/flutteruser

# Download and install Flutter (stable channel)
RUN git clone https://github.com/flutter/flutter.git -b stable --depth 1 flutter
ENV PATH="/home/flutteruser/flutter/bin:/home/flutteruser/flutter/bin/cache/dart-sdk/bin:${PATH}"

# Pre-cache Flutter web SDK to speed up builds
RUN flutter precache --web
RUN flutter config --enable-web

WORKDIR /home/flutteruser/app

# Copy pubspec files first for better Docker layer caching
COPY --chown=flutteruser:flutteruser pubspec.yaml pubspec.lock ./
RUN flutter pub get

# Copy the rest of the source code
COPY --chown=flutteruser:flutteruser . .

# Build the web release
RUN flutter build web --release

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine

ENV PORT=80

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /home/flutteruser/app/build/web /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
