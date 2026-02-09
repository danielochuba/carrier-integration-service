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
- [💻 Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Install](#install)
  - [Usage](#usage)
  - [Run tests](#run-tests)
  - [Deployment](#deployment)
- [👥 Authors](#authors)
- [🔭 Future Features](#future-features)
- [🤝 Contributing](#contributing)
- [⭐️ Show your support](#show-your-support)
- [🙏 Acknowledgements](#acknowledgements)
- [📝 License](#license)

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

### Deployment <a id="deployment"></a>

Build for production, then deploy (e.g. [Vercel](https://vercel.com/new) or [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying)):

```bash
npm run build
npm run start
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

---

## 👥 Authors <a id="authors"></a>

👤 **Your Name**

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

---

## 📝 License <a id="license"></a>

This project is [MIT](./LICENSE) licensed.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
