FROM node:18-alpine

WORKDIR /app

# First copy package files
COPY package*.json ./

RUN npm install

# Copy the rest of the application
COPY . .

# Add non-root user for security
USER node

EXPOSE 5000
CMD ["npm", "start"]
