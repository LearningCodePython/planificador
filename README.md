# 📊 Planificador de Recursos y Presupuestos

Una aplicación web completa para la gestión de presupuestos de proyectos, planificación de recursos humanos y análisis de capacidad organizacional.

## 🚀 Características Principales

### 📝 Gestión de Presupuestos
- **Creación y edición** de presupuestos de proyectos
- **Desglose detallado** por tipo de mano de obra
- **Categorización** por tipo de proyecto (Obra, Mantenimiento)
- **Estados de seguimiento** (Aceptado, Pendiente, Completado, En Espera)
- **Fechas de planificación** con inicio y fin de proyecto
- **Asignación directa** de personal a presupuestos
- **Plantillas reutilizables** para crear nuevos presupuestos basados en existentes

### 👥 Gestión de Personal
- **Registro completo** de empleados con roles específicos
- **Configuración de disponibilidad** (horas/día, días/semana)
- **Visualización de asignaciones** por persona
- **Seguimiento de proyectos** asignados a cada empleado

### 📈 Análisis de Capacidad
- **Planificación de capacidad** por tipo de mano de obra
- **Análisis de déficit y superávit** de recursos
- **Carga de trabajo individual** por empleado
- **Métricas de utilización** con indicadores visuales
- **Cronograma de ocupación semanal** con gráficos interactivos

### 📊 Visualización de Datos
- **Gráficos de barras** para ocupación semanal del personal
- **Barras de progreso** para utilización de capacidad
- **Indicadores de estado** con códigos de colores
- **Dashboard interactivo** con información en tiempo real

### 🔧 Funcionalidades Adicionales
- **Exportación a CSV** de datos de presupuestos
- **Filtrado por categorías** de proyectos
- **Mensajes de confirmación** para todas las operaciones
- **Interfaz responsive** adaptada a dispositivos móviles
- **Autenticación segura** con Firebase Auth

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React** (con Hooks)
- **Tailwind CSS** para estilos
- **Recharts** para visualizaciones de datos
- **JavaScript ES6+**

### Backend y Base de Datos
- **Firebase**
  - Authentication (autenticación anónima)
  - Firestore (base de datos NoSQL)
  - Configuración multi-usuario con datos privados

### Funcionalidades Avanzadas
- **Cálculo automático** de semanas de ocupación
- **Gestión de estado** con React useState
- **Listeners en tiempo real** para sincronización de datos
- **Validación de formularios** con mensajes de error

## 📦 Instalación

### Prerrequisitos
- Node.js (versión 14 o superior)
- npm o yarn
- Cuenta de Firebase

### Configuración del Proyecto

1. **Clona el repositorio:**
```bash
git clone [URL_DEL_REPOSITORIO]
cd planificador-recursos-presupuestos
```

2. **Instala las dependencias:**
```bash
npm install
```

3. **Configura Firebase:**
   - Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
   - Habilita Authentication y Firestore
   - Obtén las credenciales de configuración

4. **Configura las variables de entorno:**
```bash
# Crea un archivo .env en la raíz del proyecto
REACT_APP_FIREBASE_API_KEY=tu_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=tu_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=tu_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
REACT_APP_FIREBASE_APP_ID=tu_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=tu_measurement_id
```

5. **Inicia la aplicación:**
```bash
npm start
```

## 🎯 Uso de la Aplicación

### Gestión de Personal
1. **Añadir empleados** con su información básica
2. **Configurar disponibilidad** (horas y días laborables)
3. **Asignar roles** específicos por tipo de mano de obra

### Creación de Presupuestos
1. **Definir proyecto** con nombre y categoría
2. **Especificar horas totales** estimadas
3. **Desglosar por tipo de mano de obra** necesaria
4. **Asignar personal** disponible al proyecto
5. **Establecer fechas** de inicio y finalización

### Análisis de Capacidad
1. **Revisar métricas** de utilización por rol
2. **Identificar déficits** de recursos
3. **Planificar contrataciones** basadas en demanda
4. **Optimizar asignaciones** de personal

## 📊 Estructura de Datos

### Presupuestos
```javascript
{
  name: "Proyecto Alpha",
  totalHours: 500,
  laborBreakdown: [
    { type: "Ingeniero", hours: 300 },
    { type: "Diseñador", hours: 200 }
  ],
  startDate: "2024-01-01",
  endDate: "2024-03-31",
  status: "Accepted",
  category: "Obra",
  assignedPersonnel: ["userId1", "userId2"]
}
```

### Personal
```javascript
{
  name: "Juan Pérez",
  laborType: "Ingeniero",
  hoursPerDay: 8,
  daysPerWeek: 5
}
```

## 🔐 Seguridad y Privacidad

- **Autenticación Firebase** para acceso seguro
- **Datos privados por usuario** con separación total
- **Reglas de seguridad** en Firestore
- **Identificación única** por sesión de usuario

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: Amazing Feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 🎨 Capturas de Pantalla

### Dashboard Principal
- Vista general con gestión de presupuestos y personal
- Interfaz intuitiva con navegación clara

### Análisis de Capacidad
- Gráficos interactivos de ocupación
- Métricas de utilización por empleado
- Planificación semanal visualizada

### Gestión de Proyectos
- Formularios dinámicos para presupuestos
- Asignación visual de recursos
- Seguimiento de estados de proyecto

## 🚀 Próximas Funcionalidades

- [ ] Reportes avanzados en PDF
- [ ] Integración con calendarios externos
- [ ] Notificaciones automáticas
- [ ] Gestión de costos por hora
- [ ] Dashboard de métricas ejecutivas
- [ ] API REST para integraciones externas

## 📞 Soporte

Para soporte técnico o preguntas:
- Crear un [Issue](../../issues) en GitHub
- Contactar al equipo de desarrollo

---

**Desarrollado con ❤️ para optimizar la gestión de recursos y presupuestos**

