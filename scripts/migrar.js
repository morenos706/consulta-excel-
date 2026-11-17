// Aplica las migraciones pendientes y crea el administrador inicial (ADMIN_EMAIL / ADMIN_PASSWORD).
import { iniciar, cerrar } from '../server/db.js';
import { sembrarAdmin } from '../server/auth.js';

await iniciar();
await sembrarAdmin();
await cerrar();
console.log('Base de datos lista.');
