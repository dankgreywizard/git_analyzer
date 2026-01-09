# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy project files
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/static ./static

# Create repos directory
RUN mkdir -p repos

# Expose the port the app runs on
EXPOSE 5000

# Set environment variable to production
ENV NODE_ENV=production
ENV PORT=5000

# Command to run the application
CMD ["node", "dist/server/index.js"]
