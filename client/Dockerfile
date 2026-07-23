# ---- Build Stage ----
    FROM node:18-alpine AS builder

    WORKDIR /app
    
    COPY package*.json ./
    RUN npm install
    
    COPY . .
    RUN npm run build
    
    # ---- Serve Stage ----
    FROM node:18-alpine
    
    WORKDIR /app
    
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/package*.json ./
    
    RUN npm install -g serve
    
    EXPOSE 4173
    CMD ["serve", "-s", "dist", "-l", "4173"]
    