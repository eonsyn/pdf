# Update to the latest Playwright image
FROM mcr.microsoft.com/playwright:v1.54.1-jammy

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the application code
COPY . .

# Expose the port your app listens on
EXPOSE 4000

# Start the application
CMD ["node", "server.js"]
      