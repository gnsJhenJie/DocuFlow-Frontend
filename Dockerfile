# Stage 1: Build the application
FROM node:18-alpine AS builder
# Node.js 18 is a good LTS version. Alpine images are smaller.

# Set working directory
WORKDIR /app

# Install dependencies
# Copy package.json. If you have a package-lock.json, it should also be copied
# to ensure reproducible builds.
COPY package.json ./
# COPY package-lock.json ./
RUN npm install

# Copy the rest of your application code
COPY . .

# Build the Next.js application
# This will use the "build" script from your package.json
# and leverage the `output: 'standalone'` in next.config.ts
RUN npm run build

# Stage 2: Create the production image from the standalone output
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment to production
ENV NODE_ENV production
# ENV PORT 3000 # Next.js defaults to port 3000. Uncomment and set if you need a different port.

# Copy the standalone output from the builder stage.
# This includes the server.js, .next/static, public, and necessary node_modules.
COPY --from=builder /app/.next/standalone ./

# Expose the port the app runs on (Next.js default is 3000)
EXPOSE 3000

# Command to run the application
# This executes the server.js file from the standalone output.
CMD ["node", "server.js"]
