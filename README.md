# Rishwat Mukt Bharat

**Rishwat Mukt Bharat** is a civic anti-corruption guidance portal for India. It helps people understand where to report bribery, identify the correct official destination, learn about anti-corruption laws, and find the supervisory rank directly above an official named in a complaint.

> **Know your Rights, Know where to report.**

This project is an educational prototype and is **not an official Government of India website**. Users should verify every destination and current legal requirement on the relevant official portal.

## Features

- Guided multi-step complaint form with anonymous reporting support.
- OTP-based mobile verification flow.
- AI-assisted routing against the supplied Indian anti-corruption body directory.
- Direct link to the matched official website or CPGRAMS fallback.
- AI-assisted identification of the immediate officer/rank above the reported official.
- National agency directory with official contact details.
- Education page with expandable anti-corruption Acts and topics.
- Professional tables for key provisions and penalties.
- Full interface translation across 23 Indian languages.
- Constitution of India Preamble startup animation with GSAP 3D page-turn transition.
- Premium 3D card interactions with reduced-motion support.
- Responsive, classic institutional visual design using Times New Roman typography.
- Complaint notification adapters for TextBee/Textbelt SMS and SMTP email when configured.

## Technology stack

- **Frontend:** React 19, TypeScript, TSX, Vite, Wouter.
- **Backend:** Node.js, Express, TypeScript, tRPC.
- **Data layer:** Drizzle ORM, MySQL2, Zod validation.
- **Animation and interaction:** GSAP, Framer Motion.
- **UI and accessibility:** Radix UI primitives, Lucide React icons, Sonner notifications.
- **Build and tooling:** esbuild, Tailwind CSS v4, PostCSS, Prettier, Vitest, pnpm.

## Packages used

### Runtime dependencies

| Package | Purpose |
|---|---|
| `react`, `react-dom` | Component-based frontend UI |
| `vite` | Frontend development and bundling |
| `wouter` | Lightweight client-side routing |
| `express` | Node.js HTTP server |
| `@trpc/client`, `@trpc/server` | Typed client/server API procedures |
| `drizzle-orm`, `drizzle-kit` | Database ORM, schema generation, and migrations |
| `mysql2` | MySQL database driver |
| `zod` | Runtime input validation |
| `gsap` | Startup animation and 3D card interactions |
| `framer-motion` | UI motion utilities |
| `lucide-react` | Interface icons |
| `@tanstack/react-query` | Query and mutation state management |
| `superjson` | Typed data serialization |
| `nodemailer` | SMTP email notifications |
| `axios` | HTTP client utilities |
| `nanoid` | Compact unique identifiers |
| `jose` | JWT and JOSE utilities |
| `date-fns` | Date handling utilities |
| `react-hook-form`, `@hookform/resolvers` | Form state and validation helpers |
| `react-day-picker` | Date-picker UI |
| `recharts` | React charting support |
| `sonner` | Toast notifications |
| `streamdown` | Streamed content rendering |
| `embla-carousel-react` | Carousel primitives |
| `next-themes` | Theme state utilities |
| `input-otp` | OTP input component |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Class composition and styling utilities |
| `tailwindcss-animate`, `tw-animate-css` | CSS animation utilities |
| `vaul` | Drawer UI primitive |
| `cmdk` | Command-menu UI primitive |
| `cookie` | HTTP cookie parsing and serialization |
| `dotenv` | Environment variable loading |
| `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | Object storage and signed URLs |
| `@radix-ui/*` | Accessible accordion, dialog, menu, select, tabs, tooltip, and other UI primitives |

### Development and build dependencies

- `typescript` — static type checking.
- `tsx` — TypeScript execution for development.
- `esbuild` — server bundling.
- `@vitejs/plugin-react` — React support for Vite.
- `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/typography` — styling system.
- `postcss`, `autoprefixer` — CSS processing.
- `prettier` — formatting.
- `vitest` — test runner.
- `pnpm` — package manager.
- `@types/*` — TypeScript type definitions.
- `drizzle-kit` — database migration tooling.
- `@builder.io/vite-plugin-jsx-loc` — JSX source-location support.
- `add` — build/setup utility.

The exact versions are recorded in [`package.json`](./package.json) and [`pnpm-lock.yaml`](./pnpm-lock.yaml).

## Local development

```bash
pnpm install
pnpm dev
```

The development server uses port `3000` by default. To run the static frontend preview:

```bash
pnpm run dev:static
```

## Useful commands

```bash
pnpm run check       # TypeScript checks
pnpm run build       # Production frontend and server build
pnpm run build:static # Static frontend build
pnpm run start       # Serve the production server bundle
pnpm run test        # Run tests
pnpm run format      # Format source files
pnpm run db:migrate  # Apply database migrations
pnpm run db:push     # Generate and apply schema changes
```

## Important notes

- Keep secrets and provider credentials server-side; never commit them.
- SMS/email delivery requires the relevant provider configuration.
- The supplied agency directory and legal education content should be checked against current official sources before production use.
- The portal provides guidance and routing assistance; it does not itself submit a complaint to a government department.

## License

MIT
