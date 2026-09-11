# Dockerfile for Backend Container Deployment (ECS Fargate / EC2 / Docker Compose)
FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source
COPY src ./src
COPY seed ./seed

# Environment defaults
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "src/server.js"]
