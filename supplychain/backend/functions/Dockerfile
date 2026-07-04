FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for TypeScript)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Train the ML risk model (generates saved model weights)
RUN npx tsx src/scripts/train_model.ts

# Second stage: runtime
FROM node:20-alpine

WORKDIR /app

# Only install production dependencies
COPY package.json package-lock.json ./
RUN npm install --production --legacy-peer-deps

# Copy compiled output and other necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.example ./

# Copy trained ML model weights
COPY --from=builder /app/src/ml/saved_model ./dist/ml/saved_model

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start"]
