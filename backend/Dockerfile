FROM node:18-alpine

WORKDIR /app

# First copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Add non-root user for security
USER node

EXPOSE 5000
CMD ["npm", "start"]
