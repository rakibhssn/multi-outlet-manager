# Multi Outlet Manager (Tablewise)

A food and beverage management system for a company that runs several outlets. Headquarters manages companies, outlets, staff and menus; each outlet takes orders, tracks stock and staff shifts, and generates its own reports.

## Features

- **Companies and outlets** — each company (headquarters) owns outlets, and every company and outlet has its own login account.
- **Staff** — staff profiles with login accounts, transfers between outlets with a recorded work history.
- **Menus and menu items** — price history per item, per-outlet price overrides and stock.
- **Sales orders** — a point-of-sale screen to take dine-in, takeaway and delivery orders from stocked items. Confirming deducts stock, cancelling restores it, and every order has a printable and downloadable order slip.
- **Shifts and breaks** — staff clock in and out, take breaks, and outlets can manage any of their staff's shifts.
- **Outlet dashboard** — today's sales and orders compared with yesterday, staff on shift and low stock items.
- **Reports** — sales, item sales, server performance, staff shifts, attendance and stock for each outlet, with print, CSV and PDF download.

## Account types

| Account | Sees |
| --- | --- |
| `DEVELOPER` | Everything, including the companies list |
| `HEADQUARTER` | Its own company's outlets, staff, menus, sales and reports |
| `OUTLET` | Its own outlet: orders, menus, staff, shifts, dashboard and reports |
| `OUTLET_STAFF` | Same outlet screens, plus starting and ending their own shift and breaks |

## Roles and permissions

Every login holds exactly one role (`User.roleId` → `Role`). The role decides which pages and actions the account can reach.

| Role | Kind | Given to | Default access |
| --- | --- | --- | --- |
| Super Admin (`SUPER_ADMIN`) | Built-in, locked | Developer and headquarter accounts | Every permission. Cannot be edited or deleted |
| Outlet Admin (`ADMIN`) | Shared | Outlet accounts (default) | Outlet dashboard, POS and orders, menus, staff, shifts and every report |
| Manager (`MANAGER`) | Shared | Outlet staff | Orders, staff list, own and others' shifts, every report |
| Staff (`USER`) | Shared | Outlet staff (default) | Take and complete orders, own shift and breaks |

- **Catalogue.** `backend/helper/Permissions.js` holds every permission as a `resource.action` key, grouped by area. A `page` key opens a screen; an `action` key does something on it (`staff.create`, `staff.edit`, `staff.delete`, `reports.sales`, ...). Granting an action does not imply the page.
- **Checked on every request.** The auth middleware loads the account's role and permissions from the database on each request, so a change applies to the next request. Routes use `requirePermission`, `requireAll`, `requireAny`, `requireSelfOr` and `requireSuperAdmin`; a refusal returns 403 and logs a `security.permission.denied` line.
- **Frontend.** Menus carry a permission, blocked routes redirect, and buttons are hidden with `useCan`. Report tabs follow the per-report permissions.
- **Shared and company roles.** Shared roles are used by every company, so only the developer account edits them or creates new shared roles. A headquarter account creates **company roles** (for example "Cashier") that only its outlets and staff can be given.
- **Headquarter-only permissions** (companies, outlets, stock, staff transfer and history, menu and item editing, and roles) belong to Super Admin only and are not offered on other roles.
- **Roles screen** (`/hq/roles`): pick a role on the left, then edit its name, description, status and permissions on the right. A new role starts with read-only access. A role can be deleted only when nobody holds it.
- The backend syncs the catalogue and the built-in roles on every start. Run it manually with `npm run seed:roles`.

## Sessions and sign-out

- Every sign-in creates a row in `UserSession`. The access token (1 hour) and the refresh token both carry that session's id, and the API rejects either one as soon as the session is revoked or expired.
- `POST /auth/refresh` swaps a refresh token for a new pair. Each refresh token works once: reusing an old one revokes the whole session.
- **Sign out** calls `POST /auth/logout` before clearing the browser, so neither token can be used again.
- **My Account** (`/hq/account`, `/outlet/account`) shows the account, role and outlet. It lets you change your password, which signs out your other sessions, and sign out of any other device.
- When an admin resets someone's password, all of that person's sessions end.

## Tech stack

- **Backend:** Node.js, Express 5, Prisma 7 with PostgreSQL (Prisma Postgres), JWT authentication.
- **Frontend:** React 19 (Create React App with CRACO), React Router, Jotai, Formik and Yup, Tailwind CSS 4 with shadcn components on Base UI, jsPDF.

## Getting started

### Requirements

- Node.js 20 or newer
- A PostgreSQL database (the project uses Prisma Postgres)

### Install

```bash
npm install
cd frontend && npm install
```

`npm install` in the root also runs `prisma generate`.

### Environment variables

Create `.env` in the project root:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by the app |
| `PORT` | Backend port (default `3050`) |
| `CORS_ORIGINS` | Comma-separated frontend origins allowed to call the API (default `http://localhost:3000`) |
| `JWT_ACCESS_SECRET` | Secret for access tokens (valid 1 hour, renewed with the refresh token) |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (a session lasts 24 hours from its last refresh) |
| `AUTH_SECRET` | Not used by the current code; safe to remove |
| `AUTH_SEED_EMAIL` | Email of the first developer account created by the seed |
| `AUTH_SEED_PASSWORD` | Password of that account |

### Database

```bash
npx prisma migrate deploy
npm run seed:auth
```

Run migrations through a **direct** database connection, not the pooled one. With Prisma Postgres, the pooled host (`pooled.db.prisma.io`) can leave Prisma's migration lock stuck on a shared connection; use the direct host (`db.prisma.io`) for migration commands.

### Run

```bash
npm start
```

This starts the backend on `http://localhost:3050` and the frontend on `http://localhost:3000`. Run them separately with `npm run backend` and `npm run frontend`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Backend and frontend together |
| `npm run backend` | Backend with nodemon (also refreshes this README on every start and restart) |
| `npm run frontend` | Frontend dev server |
| `npm run docs` | Regenerate the API and package lists in this README |
| `npm run seed:auth` | Create the first developer account |
| `npm run seed:roles` | Sync permissions and seed default role permissions |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run db:seed` | Run the Prisma seed |

## Project structure

```
backend/
  server.js            Express app, CORS, rate limit, static uploads
  routes/              One folder per resource, mounted in routes/index.js
  controller/          Request handlers and business rules
  helper/              Auth middleware
  config/prisma.js     Prisma client
prisma/
  schema.prisma        Database schema
  migrations/          SQL migrations
frontend/src/
  Router/              HQ and outlet routes
  Screens/             Pages (HQ, Outlet, Sales, Report, Auth, Layout)
  components/          ui (shadcn primitives) and custom (form fields, table, dialogs)
  hooks/               Shared hooks (table lists, notifications, options, shifts)
  lib/                 API client, constants, helpers, PDF and CSV export
scripts/
  generate-readme.js   Builds the API and package sections below
```

## Keeping this README up to date

The **API** and **Packages** sections below are generated from the code, so they never drift:

- The API list is read from `backend/routes/index.js` and every `backend/routes/<resource>/index.js`. Endpoints after `router.use(authorization)` are marked as needing a login.
- The package list is read from `package.json` and `frontend/package.json`.
- It runs automatically every time the backend starts or restarts under nodemon, so a new route appears here as soon as the dev server reloads. Run `npm run docs` to refresh it by hand.
- To give a new endpoint a clearer description, add it to `DESCRIPTIONS` in `scripts/generate-readme.js`; otherwise a description is derived from the handler name.

Do not edit between the `START` and `END` markers — changes there are overwritten.

## Health check

`GET /health` (outside `/api/v1`, no auth, not rate limited) runs `SELECT 1` against the database with a 3 second timeout. Point hosting health checks and uptime monitors at it.

| Status | Body |
| --- | --- |
| `200` | `{ "status": "ok", "database": "up", "uptime": <seconds> }` |
| `503` | `{ "status": "error", "database": "down" }` |

## API

<!-- API:START -->
Base URL: `http://localhost:3050/api/v1` · 69 endpoints · generated from `backend/routes`.

Protected endpoints need the header `Authorization: Bearer <accessToken>` from `POST /auth/login`.

### Auth

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | No | Sign in with email and password, returns access and refresh tokens |
| `POST` | `/api/v1/auth/refresh` | No | Exchange a refresh token for a new access and refresh token (the old refresh token stops working) |
| `POST` | `/api/v1/auth/logout` | Yes | Sign out: revokes this session so its access and refresh tokens stop working |
| `GET` | `/api/v1/auth/me` | Yes | The logged-in account with its role and effective permissions |

### Account

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/account` | Yes | The signed-in account's profile, role, outlet or company, and active sessions |
| `PATCH` | `/api/v1/account/password` | Yes | Change your own password (needs the current one); signs out your other sessions |
| `DELETE` | `/api/v1/account/sessions` | Yes | Sign out of every other session |
| `DELETE` | `/api/v1/account/sessions/:id` | Yes | Sign out one of your sessions |

### Company

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/company` | Yes | List company records with search, filters and pagination |
| `GET` | `/api/v1/company/:id` | Yes | Get one company record |
| `POST` | `/api/v1/company` | Yes | Create a company record |
| `PUT` | `/api/v1/company/:id` | Yes | Update a company record |
| `PATCH` | `/api/v1/company/:id/status` | Yes | Toggle a company between active and inactive |
| `DELETE` | `/api/v1/company/:id` | Yes | Delete a company record |

### Outlet

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/outlet` | Yes | List outlet records with search, filters and pagination |
| `GET` | `/api/v1/outlet/:id` | Yes | Get one outlet record |
| `POST` | `/api/v1/outlet` | Yes | Create a outlet record |
| `PUT` | `/api/v1/outlet/:id` | Yes | Update a outlet record |
| `PATCH` | `/api/v1/outlet/:id/status` | Yes | Toggle an outlet between active and inactive |
| `POST` | `/api/v1/outlet/:id/items` | Yes | Assign menu items to an outlet with price and stock |
| `DELETE` | `/api/v1/outlet/:id` | Yes | Delete a outlet record |

### Staff

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/staff` | Yes | List staff records with search, filters and pagination |
| `GET` | `/api/v1/staff/:id` | Yes | Get one staff record |
| `POST` | `/api/v1/staff` | Yes | Create a staff record |
| `PUT` | `/api/v1/staff/:id` | Yes | Update a staff record |
| `PATCH` | `/api/v1/staff/:id/status` | Yes | Toggle a staff member between active and inactive (closes an open shift) |
| `DELETE` | `/api/v1/staff/:id` | Yes | Delete a staff record |
| `POST` | `/api/v1/staff/:id/transfer` | Yes | Transfer a staff member to another outlet |
| `GET` | `/api/v1/staff/:id/assignments` | Yes | Work history (outlet postings) of a staff member |

### Menu

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/menu` | Yes | List menu records with search, filters and pagination |
| `GET` | `/api/v1/menu/:id` | Yes | Get one menu record |
| `POST` | `/api/v1/menu` | Yes | Create a menu record |
| `PUT` | `/api/v1/menu/:id` | Yes | Update a menu record |
| `PATCH` | `/api/v1/menu/:id/status` | Yes | Toggle a menu between active and inactive |
| `DELETE` | `/api/v1/menu/:id` | Yes | Delete a menu record |

### Menu item

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/menu-item` | Yes | List menu item records with search, filters and pagination |
| `GET` | `/api/v1/menu-item/:id` | Yes | Get one menu item record |
| `POST` | `/api/v1/menu-item` | Yes | Create a menu item record |
| `PUT` | `/api/v1/menu-item/:id` | Yes | Update a menu item record |
| `DELETE` | `/api/v1/menu-item/:id` | Yes | Delete a menu item record |
| `GET` | `/api/v1/menu-item/:id/outlets` | Yes | Outlets selling a menu item with their price and stock |
| `POST` | `/api/v1/menu-item/:id/outlets` | Yes | Assign a menu item to outlets |
| `PUT` | `/api/v1/menu-item/:id/outlets/:outletId` | Yes | Update the price or stock of an item at one outlet |
| `DELETE` | `/api/v1/menu-item/:id/outlets/:outletId` | Yes | Remove a menu item from an outlet |

### Sales order

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/sales-order` | Yes | List sales orders with search, status, type, server and date filters (withItems=1 adds item lines) |
| `GET` | `/api/v1/sales-order/items` | Yes | Stocked items an outlet can sell, for taking orders |
| `GET` | `/api/v1/sales-order/:id` | Yes | Get one sales order record |
| `POST` | `/api/v1/sales-order` | Yes | Create and confirm a sales order, deducting stock |
| `PATCH` | `/api/v1/sales-order/:id/complete` | Yes | Mark a confirmed order as completed |
| `PATCH` | `/api/v1/sales-order/:id/cancel` | Yes | Cancel a confirmed order and restore its stock |
| `PATCH` | `/api/v1/sales-order/:id/slip` | Yes | Record that the order slip was generated |

### Dashboard

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/dashboard/company` | Yes | Headquarter dashboard figures across its outlets (developers may pass companyId) |
| `GET` | `/api/v1/dashboard/company/outlets` | Yes | Today's orders, items and revenue per outlet compared with yesterday |
| `GET` | `/api/v1/dashboard/company/activity` | Yes | Latest order and shift events across the company's outlets (last 48 hours) |
| `GET` | `/api/v1/dashboard/company/trend` | Yes | Daily revenue per outlet for the last 7 days (up to 8 lines, the rest folded into Other) |
| `GET` | `/api/v1/dashboard/outlet` | Yes | Outlet dashboard figures: sales, orders, staff on shift, low stock |
| `GET` | `/api/v1/dashboard/outlet/low-stock` | Yes | Items at or below the low stock limit, lowest first |

### Shift

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/shift` | Yes | Shift history with breaks |
| `GET` | `/api/v1/shift/me` | Yes | Current shift of the logged-in staff member |
| `POST` | `/api/v1/shift/start` | Yes | Clock in (staff for themselves, outlet for any of its staff) |
| `POST` | `/api/v1/shift/end` | Yes | Clock out, closing any open break |
| `POST` | `/api/v1/shift/break/start` | Yes | Start a break during an open shift |
| `POST` | `/api/v1/shift/break/end` | Yes | End the current break |

### Report

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/report/:type` | Yes | Generate a report (sales, items, servers, shifts, attendance, stock) for one outlet or all outlets (branchId=all); servers, shifts and attendance accept staffId |

### Role

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/role` | Yes | Roles the account can see, with their permissions, user counts and the permission catalogue |
| `GET` | `/api/v1/role/options` | Yes | Roles that can be given to an outlet account or staff login (optional `companyId` for the developer) |
| `POST` | `/api/v1/role` | Yes | Create a role (headquarter: for its company; developer: shared by every company) |
| `PATCH` | `/api/v1/role/:id` | Yes | Rename a role, change its description, status or permissions (Super Admin is locked) |
| `DELETE` | `/api/v1/role/:id` | Yes | Delete a role nobody holds |

### Upload

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |

### Static files

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/uploads/<folder>/<file>` | No | Uploaded images |
<!-- API:END -->

## Packages

<!-- PACKAGES:START -->
### Backend

Source: `package.json` · 15 packages

| Package | Version | Type | Used for |
| --- | --- | --- | --- |
| `@prisma/adapter-pg` | ^7.10.0 | dependency | PostgreSQL driver adapter for Prisma |
| `@prisma/client` | ^7.10.0 | dependency | Database client generated from the Prisma schema |
| `compression` | ^1.8.2 | dependency | Gzip-compresses JSON and text responses |
| `concurrently` | ^10.0.5 | dependency | Runs backend and frontend together |
| `cors` | ^2.8.6 | dependency | Cross-origin requests from the frontend |
| `dotenv` | ^18.0.3 | dependency | Loads environment variables from .env |
| `express` | ^5.2.1 | dependency | HTTP server and routing |
| `express-rate-limit` | ^8.7.0 | dependency | Request rate limiting |
| `helmet` | ^8.3.0 | dependency | Sets security headers (CSP, HSTS, nosniff, frame options) |
| `jsonwebtoken` | ^9.0.3 | dependency | Access and refresh tokens |
| `multer` | ^2.4.0 | dependency | Image uploads |
| `nodemon` | ^3.1.14 | dependency | Restarts the backend on changes and regenerates this README |
| `pg` | ^8.23.0 | dependency | PostgreSQL client |
| `prisma` | ^7.10.0 | dependency | Schema, migrations and client generation |
| `tailwind-variants` | ^3.3.1 | dependency | Tailwind style variants |

### Frontend

Source: `frontend/package.json` · 31 packages

| Package | Version | Type | Used for |
| --- | --- | --- | --- |
| `@base-ui/react` | ^1.8.0 | dependency | Unstyled UI primitives behind the shadcn components |
| `@craco/craco` | ^7.1.0 | dev | Create React App config overrides (path alias, dev server) |
| `@tailwindcss/postcss` | ^4.3.3 | dev | Tailwind CSS PostCSS plugin |
| `@tanstack/react-query` | ^5.103.2 | dependency | Server state caching |
| `@testing-library/dom` | ^10.4.2 | dependency | DOM testing utilities |
| `@testing-library/jest-dom` | ^6.9.1 | dependency | Jest matchers for the DOM |
| `@testing-library/react` | ^16.3.3 | dependency | React component testing |
| `@testing-library/user-event` | ^13.5.0 | dependency | Simulated user events in tests |
| `axios` | ^1.20.0 | dependency | HTTP client for the API |
| `class-variance-authority` | ^0.7.1 | dependency | Component style variants |
| `clsx` | ^2.1.1 | dependency | Conditional class names |
| `cn` | ^0.4.0 | dependency | Class name helper (the app uses the local cn in lib/utils) |
| `date-fns` | ^4.4.0 | dependency | Date formatting and calculations |
| `formik` | ^2.4.9 | dependency | Form state |
| `jotai` | ^3.0.0 | dependency | Global state (login, notifications, confirmations) |
| `jspdf` | ^4.2.1 | dependency | PDF downloads for reports and order slips |
| `jspdf-autotable` | ^5.0.8 | dependency | Tables inside PDF downloads |
| `postcss` | ^8.5.28 | dev | CSS processing |
| `react` | ^19.3.0 | dependency | UI library |
| `react-day-picker` | ^10.0.1 | dependency | Date picker |
| `react-dom` | ^19.3.0 | dependency | React renderer for the browser |
| `react-icons` | ^5.7.0 | dependency | Icons |
| `react-router` | ^8.4.0 | dependency | Routing |
| `react-scripts` | 5.0.1 | dependency | Create React App build tooling |
| `sonner` | ^2.0.8 | dependency | Toast notifications |
| `tailwind-merge` | ^3.7.0 | dependency | Merges Tailwind classes |
| `tailwind-variants` | ^3.3.1 | dependency | Tailwind style variants |
| `tailwindcss` | ^4.3.3 | dev | Utility-first CSS |
| `tw-animate-css` | ^1.4.0 | dependency | Tailwind animations |
| `web-vitals` | ^2.1.4 | dependency | Web performance metrics |
| `yup` | ^1.7.1 | dependency | Form validation schemas |
<!-- PACKAGES:END -->
