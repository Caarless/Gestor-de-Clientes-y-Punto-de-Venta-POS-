# Gestor-de-Clientes-y-Punto-de-Venta-POS-

🚀 ¿Para qué sirve?
Este sistema resuelve la necesidad de digitalizar la gestión de un pequeño negocio sin costes recurrentes ni configuraciones difíciles. Permite:

Centralizar la información: Guardar datos de clientes y su historial de operaciones.

Gestionar el flujo de caja: Controlar Ventas, Reparaciones y Deudas (Por Pagar).

Agilizar la venta: Un terminal de punto de venta (POS) dedicado para cobrar rápido.

Documentar: Generar recibos en PDF, imprimirlos o prepararlos para envío por email.


✨ Características Principales
1. Panel de Control (Dashboard)
Gestión de Registros: Crea, edita y elimina registros de clientes.

Tipos de Operación: Clasifica registros como Venta, Reparación o Por Pagar.

Búsqueda Global: Encuentra clientes instantáneamente por DNI, Nombre o Teléfono.

Estadísticas: Gráficos visuales de ingresos por día, semana o mes (usando Chart.js).

Historial: Visualiza todas las transacciones pasadas de un cliente específico.

2. Punto de Venta (POS)
Interfaz independiente (ventas.html) optimizada para ventas rápidas de mostrador.

Sistema de "Carrito" para agregar múltiples productos/servicios.

Generación automática de tickets/recibos.

3. Gestión de Datos y Seguridad
Persistencia Local: Usa localStorage del navegador. Tus datos no salen de tu equipo.

Copias de Seguridad: Sistema de Exportación e Importación de JSON. Puedes guardar tu base de datos en un archivo y restaurarla en otro ordenador o navegador.

4. Generación de Documentos
Vista previa de recibos profesionales.

Exportación a PDF (usando html2pdf).

Integración para imprimir o enviar por correo electrónico.


🛠️ Tecnologías Utilizadas
Este proyecto destaca por ser "Vanilla", lo que significa que es ligero y fácil de modificar:

HTML5 Semántico: Estructura limpia y accesible.

CSS3 (Variables & Flexbox/Grid): Diseño moderno, responsivo y con tema oscuro (Dark Mode) nativo.

JavaScript (ES6+): Lógica de negocio, manipulación del DOM y gestión de estado local.

Librerías Externas (vía CDN):

Lucide Icons: Para la iconografía.

Chart.js: Para las gráficas estadísticas.

html2pdf: Para generar los recibos descargables.

____________________________________________________________

📂 Estructura del Proyecto

/
├── index.html        # Panel principal (Dashboard, CRM, Historial)
├── ventas.html       # Interfaz del Punto de Venta (POS)
├── CSS/
│   ├── styles.css    # Estilos globales y del Dashboard
│   └── ventas.css    # Estilos específicos del POS
├── JS/
│   ├── script.js     # Lógica del Dashboard, persistencia y gráficos
│   └── ventas.js     # Lógica del carrito y tickets del POS
└── README.md         # Documentación

____________________________________________________________

🔧 Instalación y Uso
Al ser una aplicación estática (client-side), no requiere instalación de servidores (Node.js, PHP, Python, etc.).

Clonar el repositorio:

Bash

git clone https://github.com/TU_USUARIO/nombre-del-repo.git
Abrir la aplicación:

Haz doble clic en el archivo index.html para abrir el panel de gestión.

Haz doble clic en ventas.html para abrir el terminal de venta.

Nota: Para una mejor experiencia con las funcionalidades de exportación/importación, se recomienda usar un servidor local simple (como Live Server en VS Code), aunque funciona perfectamente abriendo el archivo directamente.

Nota extra: Para poder tener una experencia mejor aun podeis utilizar Electron para poder convertir todo esto en una "aplicación de ordenador", por mi punto de vista es mejor esta *Nota Extra*

🤝 Contribución y Código Abierto
Este proyecto es Código Abierto (Open Source). ¡Cualquier contribución es bienvenida!

Si eres desarrollador y quieres mejorar esta herramienta, siéntete libre de:

Hacer un Fork del proyecto.

Crear una rama con tu nueva funcionalidad (git checkout -b feature/AmazingFeature).

Hacer Commit de tus cambios.

Hacer Push a la rama.

Abrir un Pull Request.

Ideas para futuras mejoras:
[ ] Añadir autenticación de usuarios.

[ ] Conectar con una base de datos en la nube (Firebase/Supabase).

[ ] Gestión de inventario/stock de productos.

[ ] Soporte para múltiples idiomas.

📄 Licencia
Distribuido bajo la licencia MIT. Eres libre de usar, modificar y distribuir este software para uso personal o comercial.
