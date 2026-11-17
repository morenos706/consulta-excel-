// Servidor local / tradicional: `npm start` (producción) o `npm run dev:server`.
import { crearApp, preparar } from './app.js';

const port = Number(process.env.PORT || 3000);
await preparar();
crearApp().listen(port, () => console.log(`Familia de Nazaret · servidor en http://localhost:${port}`));
