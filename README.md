# BigQuery Release Pulse 🚀

**BigQuery Release Pulse** es una aplicación web interactiva que te permite rastrear, filtrar y compartir las últimas notas de versión de Google Cloud BigQuery en tiempo real. 

El proyecto cuenta con un backend ligero construido con **Python Flask** que realiza la agregación del feed RSS y un frontend moderno con temática espacial (Obsidian/Space) diseñado con **HTML5, CSS y JavaScript Vanilla**.

---

## 🌟 Características Principales

* **Feed en Tiempo Real**: Consume y procesa dinámicamente el feed XML oficial de Google Cloud BigQuery.
* **Separador de Novedades**: Divide los lanzamientos diarios de Google en actualizaciones individuales agrupadas y categorizadas automáticamente (`Feature`, `Announcement`, `Issue`, `Deprecation`, etc.).
* **Sistema de Caché Eficiente**: Implementa una caché en memoria de 10 minutos en el backend para acelerar las cargas de página y evitar peticiones excesivas. Incluye un botón para forzar la actualización manual.
* **Buscador y Filtros**:
  * Filtrado dinámico por categorías mediante botones.
  * Buscador por texto para encontrar palabras clave en las descripciones.
* **Guardado de Favoritos (Bookmarks)**: Guarda actualizaciones clave en marcadores locales mediante `localStorage` para revisarlas o compartirlas más tarde.
* **Integración con Twitter / X**:
  * Botón para redactar un borrador de tuit de forma instantánea.
  * Herramienta inteligente de **Auto-Trim** que recorta descripciones largas con puntos suspensivos (`...`), asegurando que el contenido (enlace incluido) se adapte perfectamente al límite de 280 caracteres.
  * Conexión fluida con el Web Intent oficial de Twitter/X.

---

## 🛠️ Requisitos Técnicos

* Python 3.10 o superior.
* Conexión a Internet (para descargar el feed original).

---

## 🚀 Instalación y Uso Local

Sigue estos pasos para ejecutar la aplicación en tu entorno local:

1. **Clona el repositorio** (o accede a la carpeta del proyecto):
   ```bash
   git clone https://github.com/pablotech80/bq-releases-notes.git
   cd bq-releases-notes
   ```

2. **Crea y activa un entorno virtual de Python**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # En Linux/macOS
   # o .venv\Scripts\activate en Windows
   ```

3. **Instala las dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Inicia el servidor Flask**:
   ```bash
   python app.py
   ```

5. **Accede en tu navegador**:
   Abre la siguiente dirección:
   👉 **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

   > [!IMPORTANT]
   > Asegúrate de ingresar usando **`http://`** y no `https://`. Intentar ingresar mediante `https://` provocará errores de conexión en el servidor de desarrollo Werkzeug.

---

## 📁 Estructura del Proyecto

* `app.py`: Archivo de servidor Flask principal. Contiene las rutas, la lógica de caché y el parser XML/HTML.
* `templates/index.html`: Estructura HTML de la interfaz y del compositor de tuits.
* `static/css/style.css`: Estilos personalizados, paleta de colores oscuros, efectos degradados de fondo y adaptabilidad móvil.
* `static/js/app.js`: Controlador dinámico de frontend (peticiones AJAX, eventos, renderizado, almacenamiento local y auto-trim de tuits).
* `requirements.txt`: Dependencias del proyecto (Flask, Requests y BeautifulSoup4).
* `.gitignore`: Configuración de exclusión para archivos temporales, entornos virtuales y caché de Python.

---

## 📜 Licencia

Este proyecto está bajo la licencia MIT. Siéntete libre de clonarlo, modificarlo y adaptarlo a tus necesidades.
