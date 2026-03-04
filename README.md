# CamBus- Sistema Inteligente de Gestión en Patio
**Aplicación Web Full-stack para Control de Acceso y Vehículos**

Este proyecto es una aplicación web integral diseñada para la gestión operativa en patios logísticos. Permite el monitoreo, control de acceso vehicular (tecnología LPR - *License Plate Recognition* simulada), administración de cámaras IoT, creación de reportes de incidencias en tiempo real y perfiles de seguridad jerárquicos.

## Características y Requisitos Cumplidos

1. **Modelo de Base de Datos Estructurado (PostgreSQL)**:
   * Tablas creadas: `usuarios`, `camaras`, `andenes`, `registros_vehiculos`, `bitacora_acciones`, `incidencias` y `estado_simulador`.
   * Manejo robusto de Relaciones (Foreing Keys), Restricciones (Check, Not Null) y Particionamiento de datos histórico.
2. **Sistema de Roles y Accesos (Seguridad):**
   * **Admin**, **Supervisor** y **Operador**. Dependiendo de quién inicie sesión, cambian las opciones del menú, los permisos en base de datos y los botones visibles en pantalla.
   * Contraseñas encriptadas mediante la extensión `pgcrypto` nativa de PostgreSQL y seguridad frontend por JWT (JSON Web Tokens).
3. **Interfaz de Usuario (UX/UI):**
   * Diseño Dark Mode responsivo con TailwindCSS 4.0, iconos Lucide y animaciones (Next.js 15, React 19).
   * Elementos modernos empresariales como tarjetas `glassmorphism`, grillas, modales flotantes y paneles interactivos.
4. **Operaciones del Sistema (CRUD Completo):**
   * Permite añadir, actualizar, visualizar y borrar registros operativos tanto de manera automática mediante el emulador de cámaras subyacente, como manualmente por medio de la interfaz. Funcional para *Cámaras*, *Vehículos* e *Incidencias*.

---

## Instrucciones de Instalación y Ejecución

Sigue estos sencillos pasos para probar el proyecto localmente sin complicaciones. 

### Prequisitos
* Tener **Node.js** (versión 20 o superior) instalado.
* Tener **PostgreSQL** (versión 16) instalado y estar ejecutándose localmente en el puerto `5432` con el usuario maestro por defecto (`postgres`).

### 1. Instalación y Despliegue en 1-Click (Nuevo Sistema Automático)

Hemos encapsulado toda la estructura, creación de usuarios, inyección de base de datos, y levantamiento de servidores en un único archivo ejecutable inteligente. 

1. Abre la carpeta del código fuente de este proyecto.
2. Haz doble click sobre el archivo **`CamBus_Installer.exe`** (Asistente Mago Nivel Empresarial).
3. Sigue los pasos en la ventana visual. El sistema automáticamente:
   * Validará Node y PostgreSQL.
   * Te solicitará la contraseña Maestra de tu usuario de PostgreSQL (`postgres`) a través de una ventana segura.
   * Compilará Next.js para el máximo rendimiento de producción.
   * Conectará a PostgreSQL para purgar instalaciones viejas, crear tu base de datos y tus andenes sin usar PgAdmin, cargando exitosamente las 50 cámaras de prueba.
   * Te creará un Acceso Directo "Lanzador de CamBus V3" en tu Escritorio.

*(Nota: Solo asegúrate de tener PostgreSQL 16 instalado en tu máquina corriendo con el puerto 5432).*

### 2. Uso de la Aplicación y Control del Simulador

1.  Dale doble click a tu nuevo acceso directo en el escritorio. Abrirá tu navegador en **`http://localhost:3000`**.
2.  Deberás iniciar sesión. Existen 3 usuarios precargados.

| Rol | Correo electrónico | Contraseña Obligatoria |
| --- | --- | --- |
| **Administrador** | `admin@cambus.local` | `CamBus2026!` |
| **Supervisor** | `supervisor1@cambus.local` | `Sup3rv1sor!` |
| **Operador** | (Crear uno nuevo manualmente) | `cambus_oper_123` |

3. El sistema **Simulador de Cámaras Automobilísticas LPR** ya no está activo por defecto. Para encenderlo (para hacer pruebas mecánicas y de stress a los andenes):
   * Inicia Sesión como Administrador.
   * Ve a "Configuración" en la Barra Lateral.
   * Enciende el Motor pulsando el botón rojo de Activación del Simulador Daemon en Background.

---
---

**Desarrollado para Entrega Final.**
> *Propiedad Intelectual de Eric Emmanuel ([ericemmanu-a11y](https://github.com/ericemmanu-a11y))*  
> *CamBus V3 - Sistema Inteligente de Gestión en Patio*
