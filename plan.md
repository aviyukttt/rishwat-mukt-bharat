# Rishwat Mukt Bharat — Manus website plan

## Product outcome
A managed, responsive public-service prototype that helps a citizen describe a bribery or corruption problem, recommends exactly one anti-corruption body from the supplied Excel directory, shows the exact directory-backed official website, explains why it matches, and gives step-by-step instructions. Non-anonymous complaint submission requires phone OTP verification; anonymous complaints remain available. Complaint tracking persists in the managed database.

## Design direction
Preserve the supplied portal as an extension: Indian tricolor strip, navy/saffron/green public-service palette, Noto Sans + Noto Serif, dense but readable information architecture, sharp 4–6px cards, visible prototype disclaimers, responsive layout, dark contrast mode, language controls, and accessible focus/labels.

## Architecture
- **Frontend:** React SPA at `/`, browser-rendered from Vite build output. One route is sufficient for the current product; `/404` remains the fallback.
- **Backend:** Express + tRPC under `/api/trpc`. Dynamic AI, OTP, and complaint operations stay on the server. No client-side AI keys or SMS credentials.
- **Directory source:** 41 normalized records generated from `Anti-Corruption_Bodies_India_Tabular.xlsx` into `shared/agencyDirectory.ts`, reused by both server prompts/fallback logic and the client display.
- **AI routing:** `assistant.recommend` sends the complete complaint context and compact directory records to Manus's server-side OpenAI-compatible LLM service. The response is schema-checked to one directory index; deterministic scoring against the same records is used when the service is unavailable. Destination URLs always come from the directory record, with CPGRAMS as the explicit fallback for rows marked portal not confirmed / via CPGRAMS.
- **Phone OTP:** `phone.sendOtp` creates a short-lived hashed OTP challenge in the database and sends the code through Textbelt's public `textbelt` key, so this prototype needs no secure credential card. Delivery failures fail closed rather than revealing a demo code. A paid Textbelt key can later be supplied through `TEXTBELT_KEY` without changing the application flow. `phone.verifyOtp` marks the challenge verified. `complaints.submit` revalidates the challenge server-side for every non-anonymous submission.
- **Complaints:** `complaints.submit` stores a tracking record with hashed phone, selected body, state, structured complaint payload, and status. `complaints.track` returns a minimal public status record by tracking ID.
- **Security/privacy:** never store raw OTP codes; never expose phone number or ID values in directory prompts unless explicitly part of complaint context (the assistant prompt will exclude ID/OTP values); keep API/SMS secrets server-side; no claim that this prototype is an official Government of India service.

## Project structure
- `client/src/pages/Home.tsx` — portal UI, complaint flow, AI finder, OTP modal/panel, tracking.
- `client/src/index.css` — preserved public-service design tokens and responsive styles.
- `shared/agencyDirectory.ts` — workbook-derived source-of-truth records and shared types.
- `server/routers.ts` — AI recommendation, OTP, complaint submission, and tracking procedures.
- `server/db.ts` + `drizzle/schema.ts` — database access and tables for OTP challenges and complaints.
- `client/public/manus-routes.json` — route manifest for `/` and `/404`.
- `client/public/logo.svg`, `app.config.ts` — project-specific identity and platform logo metadata.

## Deployment and caching
Frontend assets are built to `dist/public` and served from the same Express container as the API for this SPA. `/api/*` remains dynamic and uncached; `/manus-routes.json` and the SPA catch-all are static/public. Versioned assets may use the starter's build caching; personalized AI/OTP/complaint responses use private/no-store semantics through the API.

## Verification
- `pnpm check` for TypeScript.
- `pnpm test` for existing tests.
- `pnpm build` for the server/container build contract.
- Start `pnpm dev` on the configured port and check `/api/health` and `/manus-routes.json` with HTTP requests.
- Inspect the source/data contract to confirm all 41 workbook records and server-side secrets boundaries are present.
