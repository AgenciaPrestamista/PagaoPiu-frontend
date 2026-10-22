# 🖥️ PagaOPiu — Frontend

Aplicación web (SPA) de **PagaOPiu**, el sistema interno de préstamos personales: consulta y validación de clientes, formalización de contratos, cobranza, caja por agencia y panel de supervisión gerencial.

> **Stack:** React 19 · Vite 8 · Tailwind CSS 4 · Bootstrap Icons · Oxlint
> **Backend:** [`../pagaopiu`](../pagaopiu/README.md) (Spring Boot, API REST con sesión por cookie)

## Contenido

1. [Puesta en marcha](#-puesta-en-marcha)
2. [Scripts](#-scripts)
3. [Variables de entorno](#-variables-de-entorno)
4. [Pantallas por rol](#-pantallas-por-rol)
5. [Estructura del proyecto](#-estructura-del-proyecto)
6. [Conexión con el backend](#-conexión-con-el-backend)
7. [Sistema de diseño](#-sistema-de-diseño)
8. [Docker y despliegue](#-docker-y-despliegue)

---

## 🚀 Puesta en marcha

### Prerrequisitos
- **Node.js 20+** y **npm**
- El **backend** corriendo en `http://localhost:8080` (ver su [README](../pagaopiu/README.md))

```powershell
npm install
npm run dev
```

La aplicación queda en `http://localhost:5173`. En desarrollo, Vite reenvía todo lo que empiece con `/api` al backend (`vite.config.js`), así que no hace falta configurar CORS ni la URL de la API.

Usuarios de prueba (contraseña `password123`): `gerente`, `asesor.trujillo`, `asesor.piura`, `asesor.chiclayo`, `asesor.chimbote` y `asesor.tumbes`.

> Las fuentes (Inter y Fraunces) se cargan desde Google Fonts; sin internet se usan las fuentes del sistema.

---

## 🧰 Scripts

<!-- AUTO-GENERATED: scripts (fuente: package.json) -->

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente en el puerto 5173 |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run preview` | Sirve localmente la compilación de producción |
| `npm run lint` | Revisa el código con Oxlint (reglas de React y de hooks) |

<!-- /AUTO-GENERATED -->

---

## ⚙️ Variables de entorno

<!-- AUTO-GENERATED: variables de entorno (fuente: src/api.js y vite.config.js) -->

Vite expone al navegador las variables que empiezan con `VITE_` o `API_` (`envPrefix` en `vite.config.js`).

| Variable | Obligatoria | Descripción |
|---|---|---|
| `VITE_API_BASE_URL` | No (sí en producción) | URL del backend, con o sin el sufijo `/api`. Si no se define, la app usa la ruta relativa `/api` (proxy de Vite o de Nginx). También se acepta `API_BASE_URL`. |

Ejemplo para producción (`.env.production`):

```
VITE_API_BASE_URL=https://mi-backend.example.com
```

El backend debe tener esa URL del frontend en su variable `FRONTEND_URL` para permitir CORS con credenciales.

<!-- /AUTO-GENERATED -->

---

## 👥 Pantallas por rol

| Rol | Pantalla | Qué permite |
|---|---|---|
| Todos | **Login** | Acceso con usuario institucional; muestra un aviso cuando la sesión expiró. |
| Asesor | **Recepción Hermes / Caja del día** | Abrir la caja con la remesa diaria, ver el saldo y **cerrar la caja**. Mientras la caja está cerrada, el resto de pantallas queda bloqueado. |
| Asesor | **Consulta de clientes** | Valida DNI (RENIEC) o RUC (SUNAT), muestra aptitud crediticia, préstamos activos y acceso a su cobranza. |
| Asesor | **Nuevo préstamo** | Paso 1: parámetros y simulación. Paso 2: revisión e impresión del contrato. Paso 3: carga del contrato firmado y activación. Para empresas (RUC 20) valida en el momento que el DNI ingresado sea de un representante legal. |
| Asesor | **Cobranza y pagos** | Búsqueda por DNI o número de préstamo, cobro de la siguiente cuota, liquidación anticipada y comprobante electrónico. Marca las cuotas vencidas y bloquea los préstamos extrajudiciales. |
| Gerente | **Panel gerencial** | Indicadores consolidados o por sede, padrón de prestatarios por estado de mora, incidencias de remesas de Hermes (cierre con resolución escrita) y rendimiento por sucursal. |
| Gerente | **Administración de personal** | Alta de cuentas, activar/desactivar usuarios y restablecer contraseñas. |
| Gerente | **Cierres de caja** | Cierres por fecha y agencia: quién abrió y cerró, total cobrado, saldo final, observaciones y agencias sin apertura. |

---

## 🗂️ Estructura del proyecto

```
pegapiu-frontend/
├── index.html              # Entrada HTML (idioma, título y fuentes)
├── vite.config.js          # React + Tailwind + proxy /api → :8080
├── Dockerfile · nginx.conf # Imagen de producción con Nginx
├── vercel.json             # Reescritura SPA para Vercel
├── .oxlintrc.json          # Reglas de lint
└── src/
    ├── main.jsx            # Punto de entrada
    ├── App.jsx             # Sesión, navegación por vistas y estado de caja
    ├── api.js              # Cliente HTTP único hacia el backend
    ├── index.css           # Tema de Tailwind y estilos globales
    └── components/
        ├── Login.jsx · Navbar.jsx
        ├── RecepcionHermes.jsx        # Apertura y cierre de caja
        ├── BuscarCliente.jsx · RegistrarPrestamo.jsx · ContratoImpreso.jsx
        ├── CobranzaPagos.jsx · ComprobanteModal.jsx · DetallePrestamo.jsx
        └── PanelGerente.jsx · AdministracionUsuarios.jsx · CierresCaja.jsx
```

La navegación no usa un router: `App.jsx` guarda la vista actual en `sessionStorage` y muestra el componente correspondiente según el rol.

---

## 🔌 Conexión con el backend

- **`src/api.js`** concentra todas las llamadas (`api.auth`, `api.cliente`, `api.prestamo`, `api.contratos`, `api.pago`, `api.caja`, `api.incidencias`, `api.panel`, `api.usuarios`, `api.sucursales`). Todas envían `credentials: 'include'` porque la sesión viaja en una cookie.
- **Errores:** los mensajes del backend (`{ "error": "..." }`) se muestran tal cual al usuario.
- **Sesión expirada:** si cualquier llamada recibe `401` (sesión vencida o servidor reiniciado), `api.js` emite el evento `pagaopiu:sesion-expirada`; `App.jsx` limpia el estado local y vuelve al login con un aviso. `/auth/login` y `/auth/me` quedan fuera de esta regla.

---

## 🎨 Sistema de diseño

Los tokens viven en `src/index.css` (bloque `@theme` de Tailwind 4):

- **Tipografía:** Inter para la interfaz y Fraunces (serif) para títulos de página y cifras destacadas (`.cifra`). Los montos usan cifras tabulares.
- **Color:** terracota (`#8D3B20`, `#752F17`) como marca, con dorado (`#E0B25A`) de acento y neutros cálidos que reemplazan al gris `stone` por defecto. Fondo tipo papel `#F6F0E9`.
- **Componentes de estilo:** `.kpi-card` (tarjeta de indicador con filo de color), `.sidebar-bg` (menú con degradado), `.vista-animada` y `.titulo-display`.
- **Accesibilidad:** foco visible en todos los controles, objetivos táctiles de 40 px en pantallas táctiles y respeto por `prefers-reduced-motion`.
- **Responsive:** en pantallas menores a `md` el menú lateral se reemplaza por una barra superior con panel deslizable.

---

## 🐳 Docker y despliegue

- **Imagen:** `Dockerfile` en dos etapas (Node 20 compila con `npm ci` y `npm run build`; Nginx sirve `dist/`). Expone el puerto `80`.
- **Nginx:** `nginx.conf` redirige cualquier ruta a `index.html` (para que F5 funcione) y cachea `/assets/` por un año.
- **Vercel:** `vercel.json` aplica la misma reescritura a `index.html`.
- **Producción:** defina `VITE_API_BASE_URL` **antes** de compilar (se incorpora al bundle) y agregue la URL pública del frontend a `FRONTEND_URL` del backend. Como las cookies de sesión son `Secure` y `SameSite=None`, ambos servicios deben ir por HTTPS.
