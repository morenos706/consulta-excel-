# Fundación Familia de Nazaret · Eventos y hospedaje

Sistema web para **inscribir participantes a eventos** (convivencias, retiros, Shemá…) y **gestionar la acomodación en las habitaciones** de las casas de convivencia.

## Funciones

**Inscripción pública** (`/registro/CÓDIGO`, pensada para celular)
- Datos personales, tipo de participante (hombre solo, mujer sola, matrimonio, presbítero, seminarista), comunidad y parroquia.
- Fotos del frente y reverso del documento con la cámara del celular (se comprimen antes de enviarse). Si la persona ya asistió a otro evento, puede reutilizar las fotos que ya están guardadas.
- Menores de 18 años: datos y documento del acudiente, que son obligatorios.
- Matrimonios: se indica la identificación del cónyuge, o se marca "pendiente". Cuando el otro se inscribe, las dos inscripciones se vinculan solas y, si hay espacio, queda en la misma habitación de su cónyuge.
- Condiciones de salud o necesidades especiales (texto libre).
- Fecha límite, cupo máximo y cierre de inscripciones.

**Administración** (`/admin`)
- **Sedes y habitaciones**: número, bloque, piso, camas y tipo (matrimonial, hombres, mujeres, familiar, presbíteros, mixta). También se marca si tiene baño privado y si está fuera de servicio. Se pueden crear por lotes (101 a 115) o importar desde Excel.
- **Eventos**: cada evento tiene su enlace de inscripción y su sede.
- **Inscritos**: búsqueda y filtros, estados (inscrito, confirmado, llegó, cancelado) y fotos del documento. Se edita cada inscripción, se vinculan cónyuges a mano y se exporta a Excel.
- **Acomodación**: tablero donde se arrastra a cada persona a una habitación. En el celular se tocan varias personas y luego se pulsa "Asignar aquí".
  - Los matrimonios se mueven juntos.
  - Reglas: nunca se supera la capacidad. Pide confirmación al mezclar géneros o al poner a alguien sin su cónyuge en una matrimonial.
  - **Asignación automática**: acomoda primero a los matrimonios (y reúne a los que quedaron separados), luego a presbíteros y seminaristas y por último a cada persona según su género. Mantiene juntas a las comunidades.
  - El listado por habitación se exporta a Excel. Se imprime de dos formas: listado general por bloque y piso (con las camas libres en blanco) o un cartel por habitación para pegar en la puerta.
- **Usuarios**: administradores y coordinadores. Las acciones quedan en un registro de auditoría.

## Uso local

```bash
npm install
npm run demo      # datos de ejemplo (opcional)
npm run build
npm start         # http://localhost:3000
```

Sin `DATABASE_URL` se usa PostgreSQL embebido en `data/pgdata`. El usuario de desarrollo es `admin@nazaret.local` / `nazaret2026`. Para desarrollar con recarga en caliente: `npm run dev` (http://localhost:5173).

Pruebas: `npm test`.

## Producción (Vercel + Supabase u otro PostgreSQL)

1. Crear la base de datos y copiar la cadena de conexión (Supabase: *Project Settings › Database › Transaction pooler*, puerto 6543).
2. Importar este repositorio en Vercel. `vercel.json` ya define el build, la función `/api` y las cabeceras de seguridad.
3. Variables de entorno: `DATABASE_URL`, `JWT_SECRET` (cadena aleatoria larga), `ADMIN_EMAIL` y `ADMIN_PASSWORD` (administrador inicial).
4. Las migraciones (`db/migraciones`) se aplican solas al primer uso. También se pueden aplicar con `npm run db:migrate`.

Las tablas tienen RLS activado sin políticas: la API REST pública de Supabase no puede leer los datos personales; solo el servidor, con su conexión directa.
