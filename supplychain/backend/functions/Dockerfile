FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for TypeScript)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Second stage: runtime
FROM node:20-alpine

WORKDIR /app

# Only install production dependencies
COPY package.json package-lock.json ./
RUN npm install --production

# Copy compiled output and other necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start"]
