<a id="readme-top"></a>

# Carrier Integration Service

A backend-only [Next.js](https://nextjs.org) service for shipping carrier integrations (e.g. UPS Rating API). Exposes normalized rate quotes via a type-safe tRPC API.

---

## 📗 Table of Contents

- [📖 About the Project](#about-the-project)
  - [🛠 Built With](#built-with)
    - [Tech Stack](#tech-stack)
    - [Key Features](#key-features)
  - [System Architecture](#system-architecture)
  - [Folder Structure](#folder-structure)
- [💻 Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Branching (Gitflow)](#branching-gitflow)
  - [Install](#install)
  - [Usage](#usage)
  - [Run tests](#run-tests)
  - [Deployment](#deployment)
- [👥 Authors](#authors)
- [🔭 Future Features](#future-features)
- [🤝 Contributing](#contributing)
- [⭐️ Show your support](#show-your-support)
- [🙏 Acknowledgements](#acknowledgements)

---

## 📖 About the Project <a id="about-the-project"></a>

**Carrier Integration Service** is a backend API that aggregates shipping rate quotes from one or more carriers (e.g. UPS). It uses Ports & Adapters so new carriers can be added without changing core logic, and exposes a type-safe tRPC API for consumers.

### 🛠 Built With <a id="built-with"></a>

#### Tech Stack <a id="tech-stack"></a>

<details>
  <summary>Server</summary>
  <ul>
    <li><a href="https://nextjs.org/">Next.js</a> (App Router)</li>
    <li><a href="https://trpc.io/">tRPC</a></li>
    <li><a href="https://www.typescriptlang.org/">TypeScript</a></li>
    <li><a href="https://zod.dev/">Zod</a> (validation)</li>
  </ul>
</details>

#### Key Features <a id="key-features"></a>

- **Multi-carrier rate aggregation** — Plug in multiple `Carrier` implementations; `RateService` fetches and aggregates normalized quotes.
- **UPS integration** — OAuth 2.0 client credentials, Rating API request/response mappers, and structured error handling.
- **Type-safe API** — tRPC procedures with Zod-validated input and normalized `RateQuote` output.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## System Architecture <a id="system-architecture"></a>

The service follows **Ports & Adapters (Hexagonal)** so domain logic stays independent of HTTP, carriers, and frameworks. The public API is **tRPC**.

### Ports & Adapters

| Layer | Location | Role |
|-------|----------|------|
| **Ports** | `ports/` | Inbound/outbound contracts (e.g. `Carrier` with `getRates(request): Promise<RateQuote[]>`). No implementation details. |
| **Adapters** | `src/server/carriers/` | Implement ports for specific systems. `UpsCarrier` maps domain `RateRequest` to the UPS Rating API, calls it via injected HTTP and OAuth clients, and maps responses to normalized `RateQuote`; errors become serializable carrier errors. |
| **Domain** | `src/server/domain/`, `src/server/validations/` | Models and validation (Address, Package, RateRequest, RateQuote). Zod schemas under `validations/` drive runtime validation and types. |
| **Application services** | `src/server/services/` | Orchestrate domain and ports. `RateService` takes one or more `Carrier` implementations, calls `getRates` on each, and aggregates normalized `RateQuote[]`. |

Carriers can be swapped or added without changing domain code; HTTP and carrier details stay in adapters; tests stub ports and avoid real HTTP.

### Why Ports & Adapters?

- **Testability** — Stub ports to test domain and error paths without real APIs.
- **Flexibility** — New carriers implement the same `Carrier` port and plug into `RateService`.
- **Resilience** — Timeouts, retries, and error normalization live in adapters and shared HTTP/error layers.
- **Clarity** — Clear boundaries: domain, orchestration, carrier integration, transport.

### tRPC

tRPC is the **typed transport** into the app:

- **Router** — Root router in `src/server/trpc/`; `rate` sub-router exposes `getRates`. Procedures are thin: validate input with existing Zod schemas, call `rateService.getRates`, return `RateQuote[]`.
- **Context** — Injects `rateService` (and other deps) so procedures stay framework-only.
- **Handler** — Next.js App Router route at `/api/trpc` uses tRPC’s fetch adapter; no business logic in the route.

Result: a type-safe, schema-validated API while domain and carriers stay decoupled and testable.

### Folder Structure <a id="folder-structure"></a>

The repository is organized so that **ports** (interfaces) live at the root, **Next.js routes** in `app/`, and all **server-side logic** under `src/server/`. Config and tooling stay at the project root.

```
carrier-integration-service/
├── app/                          # Next.js App Router (HTTP surface)
├── ports/                        # Outbound contracts (carrier interface)
├── adapters/                     # Adapter implementations (currently placeholder)
├── src/
│   └── server/                   # Server logic (domain, carriers, tRPC, config)
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

#### Root level

| Path | Purpose |
|------|--------|
| **`app/`** | Next.js App Router. Defines HTTP routes only; no business logic. |
| **`ports/`** | Interfaces that external systems must implement. `Carrier` is the only port used here; adapters (e.g. UPS) depend on it. |
| **`adapters/`** | Intended for adapter implementations that implement ports. Carrier adapters currently live under `src/server/carriers/` for cohesion with server code. |
| **`src/`** | All application source code. Only `server/` is used; no separate client bundle. |

#### `app/`

| Path | Purpose |
|------|--------|
| **`app/route.ts`** | Root GET handler. Returns `{ "service": "carrier-integration-service" }`. |
| **`app/layout.tsx`** | Root layout (minimal; no UI in this backend-only app). |
| **`app/api/health/route.ts`** | GET `/api/health` → `{ "status": "ok" }`. |
| **`app/api/trpc/[trpc]/route.ts`** | POST `/api/trpc` handler. Forwards requests to the tRPC fetch adapter; all procedures are defined in `src/server/trpc/`. |

#### `ports/`

| Path | Purpose |
|------|--------|
| **`ports/carrier.ts`** | `Carrier` interface: `getRates(request: RateRequest): Promise<RateQuote[]>`. Used by `RateService` and implemented by `UpsCarrier` (and future FedEx, DHL, etc.). |
| **`ports/index.ts`** | Re-exports port types (e.g. `Carrier`) for use across the app. |

#### `src/server/`

Core server logic: domain models, validation, config, errors, HTTP client, carrier adapters, application services, and tRPC.

| Path | Purpose |
|------|--------|
| **`src/server/index.ts`** | Re-exports server modules for use by `app/` and tests. |
| **`src/server/config/`** | Environment and app config. |
| **`src/server/domain/`** | Domain types (Address, Package, RateRequest, RateQuote). Re-exports from validations so one place defines shape + parsing. |
| **`src/server/validations/`** | Zod schemas and parsers for domain and API input. |
| **`src/server/errors/`** | Structured carrier errors (validation, unavailable, rate fetch, timeout) with `toJSON()` for API responses. |
| **`src/server/http/`** | Shared HTTP client (fetch wrapper with timeout, error mapping to carrier errors). |
| **`src/server/carriers/`** | Carrier adapters that implement `Carrier`. Each carrier (e.g. UPS) has its own subfolder. |
| **`src/server/services/`** | Application services; `RateService` orchestrates carriers and aggregates quotes. |
| **`src/server/trpc/`** | tRPC setup, context, router, and procedure definitions. |

#### `src/server/config/`

| File | Purpose |
|------|--------|
| **`env.ts`** | Loads and parses `process.env` (e.g. `NODE_ENV`, `PORT`). Validates required keys and exposes typed `Env`. |
| **`index.ts`** | Re-exports config (e.g. `loadEnv`). |

#### `src/server/domain/`

| File | Purpose |
|------|--------|
| **`address.ts`** | Re-exports `Address` type and address validation/parsing. |
| **`package.ts`** | Re-exports `Package`, `Weight`, `Dimensions` and package validation. |
| **`rate-request.ts`** | Re-exports `RateRequest` and `parseRateRequest`. |
| **`rate-quote.ts`** | Re-exports `RateQuote` and `parseRateQuote`. |
| **`index.ts`** | Re-exports all domain types and parsers. |

#### `src/server/validations/`

Zod schemas live here; domain types are inferred from these and re-exported from `domain/`.

| Path | Purpose |
|------|--------|
| **`address/addressSchema.ts`** | Zod schema for Address (addressLine1, city, stateOrProvinceCode, postalCode, countryCode). |
| **`package/packageSchema.ts`** | Schemas for Weight, Dimensions, and Package. |
| **`rate-request/rateRequestSchema.ts`** | Schema for RateRequest (origin, destination, packages, optional serviceLevel). |
| **`rate-quote/rateQuoteSchema.ts`** | Schema for RateQuote (carrierId, serviceLevel, amount, currency, estimatedTransitDays). |
| **`*/index.ts`** | Re-export schema and parser for each area; **`validations/index.ts`** aggregates them. |

#### `src/server/errors/`

| File | Purpose |
|------|--------|
| **`carrier.ts`** | Defines `CarrierIntegrationError` and subclasses (`CarrierValidationError`, `CarrierUnavailableError`, `CarrierRateFetchError`, `CarrierTimeoutError`), plus `toJSON()` and `isCarrierIntegrationError()`. |
| **`index.ts`** | Re-exports error classes and helpers. |

#### `src/server/http/`

| File | Purpose |
|------|--------|
| **`client.ts`** | `HttpClient` class: configurable base URL, timeout, and headers; maps non-2xx, timeouts, and network failures to carrier error types. Used by adapters (and can back OAuth token requests). |
| **`index.ts`** | Re-exports HTTP client factory. |

#### `src/server/carriers/` and `src/server/carriers/ups/`

| File | Purpose |
|------|--------|
| **`carriers/index.ts`** | Re-exports carrier adapters and related types. |
| **`carriers/ups/index.ts`** | Re-exports UPS carrier, OAuth client, mappers, and types. |
| **`carriers/ups/oauthClient.ts`** | UPS OAuth 2.0 client-credentials: token fetch, in-memory cache, refresh before expiry, injectable HTTP client. |
| **`carriers/ups/rateRequestMapper.ts`** | Maps domain `RateRequest` → UPS Rating API request payload (addresses, packages, optional service). |
| **`carriers/ups/rateResponseMapper.ts`** | Maps UPS rate response → `RateQuote[]`; handles missing/malformed fields and skips invalid entries. |
| **`carriers/ups/upsCarrier.ts`** | Implements `Carrier`: validates input, gets OAuth token, calls rating API via injected HTTP client, maps response to `RateQuote[]`, throws structured carrier errors. |
| **`carriers/ups/oauthClient.integration.test.ts`** | Integration tests for OAuth: token reuse, refresh after clear/expiry, concurrent call deduplication (stubbed HTTP). |
| **`carriers/ups/upsCarrier.integration.test.ts`** | Integration tests for UPS carrier: request payload shape, response normalization, empty response, 401/429/malformed JSON/timeout error handling (stubbed HTTP and OAuth). |

#### `src/server/services/`

| File | Purpose |
|------|--------|
| **`rateService.ts`** | `RateService`: accepts an array of `Carrier`s, calls `getRates` on each (e.g. via `Promise.allSettled`), aggregates successful `RateQuote[]` into a single list. |
| **`index.ts`** | Re-exports `RateService` and its config type. |

#### `src/server/trpc/`

| File | Purpose |
|------|--------|
| **`trpc.ts`** | Initializes tRPC (e.g. `initTRPC.context<>()`), defines procedure helpers (e.g. public `procedure`). |
| **`context.ts`** | Builds request context (e.g. injects `rateService` from `deps.ts`). |
| **`deps.ts`** | Constructs shared dependencies (e.g. `rateService` with an empty `carriers` array by default). Wire UPS or other carriers here for production. |
| **`router.ts`** | Root router: mounts sub-routers (e.g. `rate`). |
| **`routers/rate.ts`** | Rate sub-router: `getRates` procedure with `rateRequestSchema` input, calls `ctx.rateService.getRates(input)`, returns `RateQuote[]`. |
| **`index.ts`** | Re-exports router, context, and tRPC types for the App Router handler. |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 💻 Getting Started <a id="getting-started"></a>

To get a local copy up and running, follow these steps.

### Prerequisites <a id="prerequisites"></a>

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/) (or yarn / pnpm / bun)

### Setup <a id="setup"></a>

Clone this repository into your desired folder:

```bash
git clone https://github.com/danielochuba/carrier-integration-service.git
cd carrier-integration-service
```

### Branching (Gitflow) <a id="branching-gitflow"></a>

This project uses [Gitflow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow) for branch management:

- **`main`** — Production-ready code; always deployable.
- **`develop`** — Integration branch for completed features and fixes.
- **`feature/*`** — New work (e.g. `feature/ups-carrier`, `feature/fedex-carrier`). Branch from `develop`; merge back into `develop` when done.
- **`release/*`** — Preparation for a production release (version bumps, docs). Branch from `develop`; merge into `main` and back into `develop`.
- **`hotfix/*`** — Urgent production fixes. Branch from `main`; merge into `main` and `develop`.

### Install <a id="install"></a>

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env` and set values as needed (e.g. `NODE_ENV`, `PORT`, and UPS OAuth vars if using the UPS carrier):

```bash
cp .env.example .env
```

### Usage <a id="usage"></a>

Start the development server:

```bash
npm run dev
```

The server runs at **http://localhost:3000** by default.

| Endpoint | Description |
|----------|-------------|
| [GET /](http://localhost:3000) | Service info → `{ "service": "carrier-integration-service" }` |
| [GET /api/health](http://localhost:3000/api/health) | Health check → `{ "status": "ok" }` |
| [POST /api/trpc](http://localhost:3000/api/trpc) | tRPC endpoint |

### Run tests <a id="run-tests"></a>

Run the test suite once ([Vitest](https://vitest.dev)):

```bash
npm run test
```

Run tests in watch mode (re-runs on file changes):

```bash
npm run test:watch
```

Coverage includes integration tests for the UPS carrier: rate normalization, OAuth token reuse and refresh, and error scenarios (401, 429, malformed JSON, timeout), all using stubbed HTTP and OAuth.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


## 👥 Authors <a id="authors"></a>

👤 **Daniel Ochuba**

- GitHub: [@danielochuba](https://github.com/danielochuba)
- LinkedIn: [Daniel Ochuba Ugochukwu](https://www.linkedin.com/in/daniel-ochuba-ugochukwu)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 🔭 Future Features <a id="future-features"></a>

- [ ] Add more carriers (e.g. FedEx, DHL) via the same `Carrier` port.
- [ ] Optional caching or rate limiting for the tRPC rate procedure.
- [ ] OpenAPI or REST fallback for consumers that cannot use tRPC.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 🤝 Contributing <a id="contributing"></a>

Contributions, issues, and feature requests are welcome. Feel free to check the [issues page](../../issues/).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## ⭐️ Show your support <a id="show-your-support"></a>

If you find this project useful, please consider giving it a star.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 🙏 Acknowledgements <a id="acknowledgements"></a>

- [Next.js](https://nextjs.org/) and [tRPC](https://trpc.io/) documentation.
- [UPS Developer Portal](https://developer.ups.com/) for Rating and OAuth API references.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

