# apps/web — Aplicación web administrativa

Next.js 16 (App Router) + TypeScript + Tailwind CSS.

Uso: responsables SST, administradores de empresa, gerentes,
supervisores y auditores.

## Estado (Fase 5 — en progreso)

Implementado y probado end-to-end contra la API real:

- **`/login`**: autenticación de desarrollo (llama a `POST /api/v1/auth/dev-login`;
  en producción se reemplaza por el flujo de Amazon Cognito, ver
  `apps/api/src/auth/strategies/jwt.strategy.ts`).
- **`/dashboard`**: indicadores generales (trabajadores, brigadistas,
  contratistas, inspecciones, hallazgos abiertos, acciones vencidas,
  capacitaciones, accidentes, simulacros) y el desglose de hallazgos por
  nivel de riesgo con la paleta de estado fija 🟢🟡🟠🔴 (buena/atención/
  riesgo/crítico), siguiendo la skill de visualización de datos del
  proyecto (icono + etiqueta siempre visibles, nunca solo color).
- **`/trabajadores`**: listado y alta de trabajadores (sede/área
  dependientes, vía el nuevo `GET /api/v1/sites`).
- **`/brigada`**: listado y alta de brigadistas, con el semáforo de
  competencia (`Badge` con la misma paleta de estado) y detalle de
  competencias por brigadista (`GET /brigadists/:id/competency-status`).
- **`/inspecciones`** y **`/inspecciones/[id]`**: crear inspecciones,
  registrar hallazgos (que generan su acción correctiva en la misma
  llamada) y cerrar el ciclo completo (evidencia → verificación →
  cierre) directamente desde la interfaz — el flujo insignia de
  `docs/ARCHITECTURE.md` §8, ahora operable sin curl/Postman.
- Menú lateral con las 20 secciones de la sección 58 del alcance
  funcional; los módulos de arriba están habilitados, el resto aparece
  marcado "pronto" — se activan a medida que sus módulos de backend
  correspondientes se implementen (ver `apps/api/README.md`).

Probado de punta a punta con automatización de navegador: login →
crear trabajador → registrarlo como brigadista → crear inspección →
registrar hallazgo → subir evidencia → verificar y cerrar, todo contra
la API y la base de datos reales.

Pendiente de esta fase: el resto de las pantallas (capacitación,
riesgos, accidentes, EPP, equipos, emergencias, simulacros,
contratistas, documentos), que siguen el mismo patrón ya establecido
aquí (páginas en `app/<módulo>/page.tsx`, componentes compartidos en
`components/` como `AppShell` y `Badge`, llamadas a la API en
`lib/api.ts`).

## Correr en desarrollo

Requiere que `apps/api` esté corriendo (ver `apps/api/README.md`) con la
Empresa Demo Colombia sembrada.

```bash
cp .env.local.example .env.local   # ajustar NEXT_PUBLIC_API_URL si aplica
npm install
npm run dev
```

Abrir `http://localhost:3000` — redirige a `/login` si no hay sesión.
Usuarios de prueba (clave de desarrollo `demo123` salvo que se haya
cambiado `DEV_LOGIN_SECRET` en el backend): `sst@empresademo.co`,
`admin@empresademo.co`, `supervisor@empresademo.co`,
`inspector@empresademo.co`.
