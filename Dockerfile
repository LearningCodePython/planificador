# Etapa de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos esenciales
COPY package*.json ./
RUN npm install

# Copiar el resto del código fuente
COPY . .

RUN npm run build

## Etapa de producción

FROM nginx:1.25-alpine

# Copiar la build al contenedor NGINX
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


## ── Etapa 1: build ──────────────────────────────────────────

#FROM node:20-alpine AS builder

#WORKDIR /app
#COPY package.json ./
#RUN npm install
#COPY . .

## ── Etapa 2: serve ──────────────────────────────────────────

#FROM nginx:1.25-alpine

#COPY --from=builder /app/dist /usr/share/nginx/html
#COPY nginx.conf /etc/nginx/conf.d/default.conf

#EXPOSE 80
#CMD ["nginx", "-g", "daemon off;"]
