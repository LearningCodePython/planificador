# 📈 Planificador de Recursos y Presupuestos

Aplicación web para la gestión de presupuestos y personal, orientada a planificación de carga de trabajo, capacidad y asignación de recursos. Desarrollada en **React** con backend en **Firebase (Firestore + Authentication)**.

---

## 🚀 Funcionalidades principales

* Gestión de presupuestos: creación, edición, eliminación y duplicado de presupuestos.
* Gestión de personal: añadir, editar y eliminar empleados con control de horas disponibles.
* Asignación de personal a presupuestos.
* Cálculo automático de:

  * Carga de trabajo global (por roles).
  * Carga de trabajo individual (por empleado).
  * Utilización de capacidad.
  * Sobrecargas y déficit de horas.
* Filtrado de presupuestos por categorías (obra, mantenimiento, etc.)
* Exportación de presupuestos a CSV.
* Interfaz de usuario responsiva y moderna.
* Autenticación anónima en Firebase.
* Base de datos en tiempo real con Firestore.

---

## 📦 Tecnologías utilizadas

* **React** (JSX, Hooks, Functional Components)
* **Firebase**

  * Firestore (Base de datos NoSQL)
  * Authentication (Acceso anónimo o con token)
* **Tailwind CSS** (estilos CSS modernos y adaptables)
* **Blob API** (para exportación CSV)
* \*\*React State & useEffect/useCallback Hooks)

---

## ⚙ Requisitos

* Node.js >= 16
* Cuenta de Firebase con Firestore y Authentication habilitados

---

## 🛠 Instalación y configuración

### 1️⃣ Clonar el repositorio

```bash
git clone git@github.com:LearningCodePython/planificador.git
cd planificador
```

### 2️⃣ Instalar dependencias

```bash
npm install
```

### 3️⃣ Configuración de variables de entorno

Crear un archivo `.env` en la raíz del proyecto con tus credenciales de Firebase:

```env
REACT_APP_FIREBASE_API_KEY=tu_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=tu_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=tu_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
REACT_APP_FIREBASE_APP_ID=tu_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=tu_measurement_id
```

Puedes obtener esta información desde tu consola de Firebase.

### 4️⃣ Ejecutar en modo desarrollo

```bash
npm start
```

---

## 🛙 Notas adicionales

* Por defecto utiliza autenticación anónima en Firebase.
* Soporta múltiples usuarios de forma aislada (cada `userId` tiene sus propios datos).
* Puede integrarse fácilmente con sistemas de autenticación personalizados o tokens de acceso.

---

## 📓 Licencia

Proyecto desarrollado como ejemplo de planificación de recursos para proyectos.

---

## 📮 Contacto

Para dudas, sugerencias o mejoras, puedes abrir un issue o contactar directamente.

---

