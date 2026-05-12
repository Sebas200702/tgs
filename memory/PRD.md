# OutSide - PRD (Product Requirements Document)

## Original Problem Statement
"Hola necesito que me ayudes a desarrollar esta web, te pase las funcionalidades y te di ejemplos de diseño."

Plataforma de reserva de canchas sintéticas en Barranquilla, Colombia.

## Iteration 2 — User Feedback (Feb 2026)
- Moneda debe ser COP (no USD).
- Canchas deben ser REALES de Barranquilla (5 reales geo-referenciadas).
- Mapa Google Maps embebido en cada cancha.
- Footer debe tener links funcionales.
- Sistema de "Registra tu cancha" público funcional.
- Categorías de torneos.
- Estadísticas (horas más/menos solicitadas) y exportación CSV de reservas.
- Items de ingreso (niños, mascotas, parqueadero, etc.).
- Direcciones, cómo llegar, puntos de referencia.

## User Choices
- Auth: Emergent-managed Google login + dev-seed para testing.
- Image uploads: Object Storage.
- Pagos: Stripe (currency=COP).
- Admin seed: `admin@outside.com` (configurable en `ADMIN_EMAILS`).

## Architecture
- Backend: FastAPI + MongoDB (motor).
- Frontend: React 19 + Tailwind + Shadcn/UI + Sonner.
- Auth: Emergent OAuth (session_token cookie/Bearer).
- Pagos: Stripe via `emergentintegrations` (currency='cop').
- Storage: Emergent Object Storage.

## Personas
- **Visitante**: Browse canchas/torneos, ver mapa y servicios, registrar su propia cancha.
- **Usuario**: Login Google, reservar, pagar (Stripe COP), cancelar/confirmar, postular equipos.
- **Administrador**: CRUD locales/canchas/torneos/descuentos, ver reservas, gestionar solicitudes de afiliación, estadísticas, exportar CSV.

## Core Requirements
1. Admin CRUD: canchas, locales, torneos (con categoría), descuentos (4 tipos).
2. User: reservar con cálculo dinámico (precio × multiplicador_día × multiplicador_hora × descuento).
3. Stripe checkout en COP.
4. Torneos con categorías: Infantil, Juvenil, Senior, Veteranos, Mixto.
5. Subida de imágenes via Object Storage.
6. Geo-referenciación + Google Maps embed + cómo llegar.
7. Items de ingreso por cancha (8 servicios).
8. Estadísticas: horas más/menos solicitadas, ingresos potenciales/confirmados.
9. Exportación CSV de reservas.
10. Formulario público "Registra tu cancha" + workflow admin de aprobación.
11. Footer + 5 páginas estáticas (Quiénes somos, FAQ, Términos, Privacidad, Contacto).

## What's been Implemented
### Iteration 1 (Feb 2026)
- Auth Google + dev-seed, CRUD básico, reservas, descuentos, torneos, upload, Stripe checkout, polling de pago.
- Home, Canchas list, Cancha detail, Mis Reservas, Torneos, Admin (5 tabs), Dashboard, Payment success.
- Diseño sage-green con Outfit/Figtree/Caveat fonts.

### Iteration 2 (Feb 2026 — current)
- ✅ Moneda COP en todo (display formatCOP + Stripe currency='cop').
- ✅ 5 canchas REALES geo-referenciadas en Barranquilla (La 8 FC, Goal FC, Mundial Soccer 5, Estadio Norte, Sintética del Norte) = 10 canchas totales.
- ✅ Google Maps iframe embebido + botón "Abrir en Google Maps" (link a direcciones).
- ✅ Items de ingreso por cancha (8 servicios con iconos): niños, mascotas, parqueadero, vestidores, iluminación, cafetería, duchas, árbitro.
- ✅ Cómo llegar + puntos de referencia + teléfono + horario.
- ✅ Categorías de torneos (Infantil/Juvenil/Senior/Veteranos/Mixto) + cupo máximo.
- ✅ Página "Registra tu cancha" pública con formulario.
- ✅ Tab "Solicitudes" en admin para aprobar/rechazar registros.
- ✅ Tab "Estadísticas" con KPIs, gráfico de horas más solicitadas, exportación CSV.
- ✅ 5 páginas estáticas funcionales (Quiénes somos, FAQ, Términos, Privacidad, Contacto).
- ✅ Footer rediseñado con links a todas las páginas reales.
- ✅ Tests backend: **100% (52/52)**.

## Backlog (P1/P2)
- **P1**: EmailStr validation + rate limiting en `/api/registros-cancha`.
- **P1**: Gate `/api/auth/dev-seed` con ENABLE_DEV_SEED env flag para prod.
- **P1**: Validar el flujo Stripe COP completo con tarjeta de prueba real (sk_test_emergent puede tener limitaciones para COP).
- **P2**: Splitting de server.py en routers (auth, locales, canchas, reservas, descuentos, torneos, payments, stats, registros).
- **P2**: Notificaciones por email (Resend) cuando se aprueba un registro o se confirma una reserva.
- **P2**: Generador automático de partidos/brackets en torneos.
- **P2**: PDF export de reservas (csv ya está).
- **P2**: Map view de canchas (todos los pins en un mapa en /canchas).
- **P2**: Reviews/ratings por usuario.
- **P2**: stats_horas filtrar por fechas futuras vs pasadas.

## Next Tasks
- Configurar email validation y rate-limit en endpoints públicos.
- Email notifications (Resend) para approvals + reserva confirmada.
- Validación full E2E del flujo Stripe COP.
