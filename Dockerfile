FROM node:20

WORKDIR /app
COPY . .

# Install dependencies
RUN npm install

EXPOSE 8080

CMD ["node", "server.js"]