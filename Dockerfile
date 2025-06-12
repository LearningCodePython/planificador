# Etapa de construcción
FROM node:20-alpine AS builder

WORKDIR /app

# Definir argumentos de construcción para las variables de Firebase
# Estas variables se pasarán al comando 'npm run build'
ARG REACT_APP_FIREBASE_API_KEY
ARG REACT_APP_FIREBASE_AUTH_DOMAIN
ARG REACT_APP_FIREBASE_PROJECT_ID
ARG REACT_APP_FIREBASE_STORAGE_BUCKET
ARG REACT_APP_FIREBASE_MESSAGING_SENDER_ID
ARG REACT_APP_FIREBASE_APP_ID
ARG REACT_APP_FIREBASE_MEASUREMENT_ID

# Copiar archivos esenciales
COPY package*.json ./
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Construir la aplicación, pasando los argumentos de construcción como variables de entorno
# El sistema de construcción de React (como Create React App) detecta automáticamente
# las variables que empiezan con REACT_APP_ si están presentes en el entorno de construcción.
# Aquí las pasamos explícitamente para asegurar que estén disponibles para 'npm run build'.
RUN REACT_APP_FIREBASE_API_KEY=$REACT_APP_FIREBASE_API_KEY \
    REACT_APP_FIREBASE_AUTH_DOMAIN=$REACT_APP_FIREBASE_AUTH_DOMAIN \
    REACT_APP_FIREBASE_PROJECT_ID=$REACT_APP_FIREBASE_PROJECT_ID \
    REACT_APP_FIREBASE_STORAGE_BUCKET=$REACT_APP_FIREBASE_STORAGE_BUCKET \
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID=$REACT_APP_FIREBASE_MESSAGING_SENDER_ID \
    REACT_APP_FIREBASE_APP_ID=$REACT_APP_FIREBASE_APP_ID \
    REACT_APP_FIREBASE_MEASUREMENT_ID=$REACT_APP_FIREBASE_MEASUREMENT_ID \
    npm run build

# Etapa de producción
FROM nginx:alpine

# Copiar la build al contenedor NGINX
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
