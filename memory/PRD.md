# OutSide - PRD (Product Requirements Document)

## Original Problem Statement
"Hola necesito que me ayudes a desarrollar esta web, te pase las funcionalidades y te di ejemplos de diseño."

User-provided spec:
- Platform: **OutSide** — synthetic football court (cancha sintética) booking platform for Barranquilla, Colombia.
- Roles: Admin / User.
- Models: Usuario, Cancha, Local, Reserva, Torneo, Partido, Equipo, Descuento (with 4 validity types), PrecioDia, PrecioHora.

## User Choices (from ask_human)
- Auth: Emergent-managed Google login.
- Image uploads: Yes (Object Storage).
- MVP scope: Full — includes torneos, postulations, partidos.
- Payments: Stripe.
- Admin seed: `admin@outside.com` (any email in `ADMIN_EMAILS` env var becomes admin on first login).

## Architecture
- **Backend**: FastAPI + MongoDB (motor async).
- **Frontend**: React 19 + Tailwind + Shadcn/UI + Sonner toasts.
- **Auth**: Emergent OAuth (session_token cookie + Bearer fallback).
- **Payments**: Stripe via `emergentintegrations` (currency USD test mode).
- **Object Storage**: Emergent Object Storage via `EMERGENT_LLM_KEY`.

## Personas
- **Visitante**: Browses canchas and torneos, can view info without auth.
- **Usuario**: Logs in via Google, makes reservations, pays via Stripe, postulates teams to torneos.
- **Administrador**: Manages locales, canchas, reservas, torneos, and descuentos via `/admin` panel.

## Core Requirements (static)
1. Admin can CRUD canchas, locales, torneos, descuentos.
2. Admin can view all reservas (with user info).
3. User can reserve a cancha (with conflict checking).
4. Dynamic pricing: `precio_base × multiplicador_dia × multiplicador_hora × (1 - descuento%/100)`.
5. Descuento conditions support 4 types: rango-fecha, rango-hora, rango-fecha-hora, fecha-hora-exacta.
6. User can cancel/confirm own reservas.
7. Stripe checkout for paying reservas.
8. Torneos: list, detail, postular equipo (when abierto).
9. Image upload for canchas (with custom backend file serving).

## What's been Implemented (Feb 2026)
- ✅ Backend: auth (Emergent + dev-seed), locales CRUD, canchas CRUD, reservas (create/list/cancel/confirm), discounts (4 condition types), torneos (CRUD + postulation), upload + file serving, Stripe checkout + status polling + webhook, stats endpoint, seed data on startup.
- ✅ Frontend: Home (hero, stats band, canchas destacadas, news/eventos), Canchas listing with search, Cancha detail with date/hour picker + price calculation + reservation, Mis Reservas dashboard with cancel/confirm/pay actions, Torneos listing and detail with team postulation, Admin panel with 5 tabs (locales/canchas/reservas/torneos/descuentos), Login via Google OAuth, Dashboard for user profile, Payment success with polling, Toast notifications, Responsive Navbar + Footer.
- ✅ Design: Sage-green/mint palette, Outfit/Figtree/Caveat fonts, pill-shaped CTAs, rounded 3xl cards, hand-drawn accent text.
- ✅ Testing: 96.2% backend pass rate (25/26 tests). Only minor Stripe placeholder issue fixed (try/except).

## Backlog (P1 / P2)
- **P1**: Admin: bulk discounts editor; Admin: tournament bracket (partidos) generator; calendar view of reservations.
- **P1**: User: profile edit (apellido, edad).
- **P2**: Email notifications on reserva confirmada (Resend).
- **P2**: Search by date/hour availability across all canchas.
- **P2**: Multi-image upload per cancha (current is single).
- **P2**: Currency support for COP (currently USD test mode).
- **P2**: Map view of canchas (Google Maps embed).
- **P2**: Reviews/ratings system per cancha (currently only local).

## Next Tasks
- Validate end-to-end Stripe payment flow with real test card.
- Add tournament bracket generation (partidos auto-creation).
- Add date-range availability search.
