FROM node:20

WORKDIR /app
COPY . .

# Install dependencies
RUN npm install

# Install Vite and build the Vue app
RUN npm run build
RUN npm run dev-db

EXPOSE 8080

CMD ["node", "server.cjs"]