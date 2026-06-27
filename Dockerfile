# ---- RoadSense AI · Cloud Run image -------------------------------------
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
# tsx runs the TypeScript server directly; bring source + built frontend.
COPY --from=build /app/dist ./dist
COPY server ./server
COPY services ./services
COPY data ./data
COPY types.ts ./types.ts
COPY tsconfig.json ./tsconfig.json
EXPOSE 8787
ENV PORT=8787
CMD ["npm", "run", "start"]
