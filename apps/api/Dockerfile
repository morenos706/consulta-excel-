# Build multi-stage: la imagen final no lleva devDependencies ni código
# fuente TypeScript, solo el bundle compilado y el cliente de Prisma ya
# generado — ver docs/DEPLOYMENT.md.

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

COPY --from=build /app/dist ./dist

# No correr como root dentro del contenedor.
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3001
CMD ["node", "dist/main.js"]
