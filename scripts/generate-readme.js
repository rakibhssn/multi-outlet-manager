const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ROUTES = path.join(ROOT, "backend", "routes");
const README = path.join(ROOT, "README.md");
const API_BASE = "/api/v1";

const ROUTE_PATTERN = /router\.(get|post|put|patch|delete)\(\s*"([^"]*)"\s*,([\s\S]*?)\);/g;
const MOUNT_PATTERN = /router\.use\(\s*"([^"]+)"\s*,\s*(authorization\s*,\s*)?require\("\.\/([^"]+)"\)\s*\)/g;

const DESCRIPTIONS = {
  "POST /auth/login": "Sign in with email and password, returns access and refresh tokens",
  "PATCH /company/:id/status": "Toggle a company between active and inactive",
  "PATCH /outlet/:id/status": "Toggle an outlet between active and inactive",
  "POST /outlet/:id/items": "Assign menu items to an outlet with price and stock",
  "PATCH /staff/:id/status": "Toggle a staff member between active and inactive (closes an open shift)",
  "POST /staff/:id/transfer": "Transfer a staff member to another outlet",
  "GET /staff/:id/assignments": "Work history (outlet postings) of a staff member",
  "PATCH /menu/:id/status": "Toggle a menu between active and inactive",
  "GET /menu-item/:id/outlets": "Outlets selling a menu item with their price and stock",
  "POST /menu-item/:id/outlets": "Assign a menu item to outlets",
  "PUT /menu-item/:id/outlets/:outletId": "Update the price or stock of an item at one outlet",
  "DELETE /menu-item/:id/outlets/:outletId": "Remove a menu item from an outlet",
  "GET /sales-order": "List sales orders with search, status, type, server and date filters (withItems=1 adds item lines)",
  "GET /sales-order/items": "Stocked items an outlet can sell, for taking orders",
  "POST /sales-order": "Create and confirm a sales order, deducting stock",
  "PATCH /sales-order/:id/complete": "Mark a confirmed order as completed",
  "PATCH /sales-order/:id/cancel": "Cancel a confirmed order and restore its stock",
  "PATCH /sales-order/:id/slip": "Record that the order slip was generated",
  "GET /dashboard/company": "Headquarter dashboard figures across its outlets (developers may pass companyId)",
  "GET /dashboard/company/outlets": "Today's orders, items and revenue per outlet compared with yesterday",
  "GET /dashboard/company/trend": "Daily revenue per outlet for the last 7 days (up to 8 lines, the rest folded into Other)",
  "GET /dashboard/company/activity": "Latest order and shift events across the company's outlets (last 48 hours)",
  "GET /dashboard/outlet": "Outlet dashboard figures: sales, orders, staff on shift, low stock",
  "GET /dashboard/outlet/low-stock": "Items at or below the low stock limit, lowest first",
  "GET /shift": "Shift history with breaks",
  "GET /shift/me": "Current shift of the logged-in staff member",
  "POST /shift/start": "Clock in (staff for themselves, outlet for any of its staff)",
  "POST /shift/end": "Clock out, closing any open break",
  "POST /shift/break/start": "Start a break during an open shift",
  "POST /shift/break/end": "End the current break",
  "GET /report/:type": "Generate a report (sales, items, servers, shifts, attendance, stock) for one outlet or all outlets (branchId=all); servers, shifts and attendance accept staffId",
  "POST /auth/refresh": "Exchange a refresh token for a new access and refresh token (the old refresh token stops working)",
  "POST /auth/logout": "Sign out: revokes this session so its access and refresh tokens stop working",
  "GET /account": "The signed-in account's profile, role, outlet or company, and active sessions",
  "PATCH /account/password": "Change your own password (needs the current one); signs out your other sessions",
  "DELETE /account/sessions": "Sign out of every other session",
  "DELETE /account/sessions/:id": "Sign out one of your sessions",
  "GET /auth/me": "The logged-in account with its role and effective permissions",
  "GET /role": "Roles the account can see, with their permissions, user counts and the permission catalogue",
  "GET /role/options": "Roles that can be given to an outlet account or staff login (optional `companyId` for the developer)",
  "POST /role": "Create a role (headquarter: for its company; developer: shared by every company)",
  "PATCH /role/:id": "Rename a role, change its description, status or permissions (Super Admin is locked)",
  "DELETE /role/:id": "Delete a role nobody holds",
  "GET /reminder": "Company reminders (`status` = OPEN, DONE or all) with open, overdue and done counts",
  "POST /reminder": "Create a reminder with a title, notes, due date and time, priority, and an optional outlet and staff mention",
  "PUT /reminder/:id": "Edit a reminder",
  "PATCH /reminder/:id/done": "Mark a reminder done (`done: false` reopens it)",
  "DELETE /reminder/:id": "Delete a reminder",
  "POST /upload/image": "Upload an image and get its public URL",
};

const ACTIONS = {
  list: (resource) => `List ${resource} records with search, filters and pagination`,
  details: (resource) => `Get one ${resource} record`,
  create: (resource) => `Create a ${resource} record`,
  update: (resource) => `Update a ${resource} record`,
  remove: (resource) => `Delete a ${resource} record`,
  changeStatus: (resource) => `Toggle ${resource} status`,
};

const PURPOSES = {
  "@prisma/adapter-pg": "PostgreSQL driver adapter for Prisma",
  "@prisma/client": "Database client generated from the Prisma schema",
  concurrently: "Runs backend and frontend together",
  cors: "Cross-origin requests from the frontend",
  dotenv: "Loads environment variables from .env",
  compression: "Gzip-compresses JSON and text responses",
  helmet: "Sets security headers (CSP, HSTS, nosniff, frame options)",
  express: "HTTP server and routing",
  "express-rate-limit": "Request rate limiting",
  jsonwebtoken: "Access and refresh tokens",
  multer: "Image uploads",
  nodemon: "Restarts the backend on changes and regenerates this README",
  pg: "PostgreSQL client",
  prisma: "Schema, migrations and client generation",
  "@base-ui/react": "Unstyled UI primitives behind the shadcn components",
  "@tanstack/react-query": "Server state caching",
  axios: "HTTP client for the API",
  "class-variance-authority": "Component style variants",
  clsx: "Conditional class names",
  "date-fns": "Date formatting and calculations",
  formik: "Form state",
  jotai: "Global state (login, notifications, confirmations)",
  jspdf: "PDF downloads for reports and order slips",
  "jspdf-autotable": "Tables inside PDF downloads",
  react: "UI library",
  "react-dom": "React renderer for the browser",
  "react-day-picker": "Date picker",
  "react-icons": "Icons",
  "react-router": "Routing",
  "react-scripts": "Create React App build tooling",
  sonner: "Toast notifications",
  "tailwind-merge": "Merges Tailwind classes",
  "tailwind-variants": "Tailwind style variants",
  "tw-animate-css": "Tailwind animations",
  yup: "Form validation schemas",
  "@craco/craco": "Create React App config overrides (path alias, dev server)",
  "@tailwindcss/postcss": "Tailwind CSS PostCSS plugin",
  postcss: "CSS processing",
  tailwindcss: "Utility-first CSS",
  cn: "Class name helper (the app uses the local cn in lib/utils)",
  "@testing-library/dom": "DOM testing utilities",
  "@testing-library/jest-dom": "Jest matchers for the DOM",
  "@testing-library/react": "React component testing",
  "@testing-library/user-event": "Simulated user events in tests",
  "web-vitals": "Web performance metrics",
};

const read = (file) => fs.readFileSync(file, "utf8");

const humanize = (value) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_.]/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

function parseMounts() {
  const mounts = [];
  for (const match of read(path.join(ROUTES, "index.js")).matchAll(MOUNT_PATTERN)) {
    mounts.push({ prefix: match[1], dir: match[3], secured: Boolean(match[2]) });
  }
  return mounts;
}

function handlerOf(args) {
  const last = args.split(",").pop().trim();
  return /^[\w.]+$/.test(last) ? last : null;
}

function parseRoutes(mount) {
  const source = read(path.join(ROUTES, mount.dir, "index.js"));
  return [...source.matchAll(ROUTE_PATTERN)]
    .map((match) => ({
      method: match[1].toUpperCase(),
      path: `${mount.prefix}${match[2] === "/" ? "" : match[2]}`,
      handler: handlerOf(match[3]),
      secured: mount.secured || /\bauthorization\b/.test(match[3]),
    }))
    .filter((route) => route.handler);
}

function describe(route, resource) {
  const override = DESCRIPTIONS[`${route.method} ${route.path}`];
  if (override) return override;
  const action = route.handler.split(".").pop();
  return ACTIONS[action] ? ACTIONS[action](resource) : humanize(action);
}

function apiSection() {
  const mounts = parseMounts();
  const groups = mounts.map((mount) => ({ mount, routes: parseRoutes(mount) }));
  const total = groups.reduce((sum, group) => sum + group.routes.length, 0);
  const lines = [
    `Base URL: \`http://localhost:3050${API_BASE}\` · ${total} endpoints · generated from \`backend/routes\`.`,
    "",
    "Protected endpoints need the header `Authorization: Bearer <accessToken>` from `POST /auth/login`.",
  ];

  for (const { mount, routes } of groups) {
    const resource = humanize(mount.prefix.replace(/^\//, "")).toLowerCase();
    lines.push("", `### ${humanize(mount.prefix.replace(/^\//, ""))}`, "");
    lines.push("| Method | Endpoint | Auth | Description |", "| --- | --- | --- | --- |");
    for (const route of routes) {
      lines.push(
        `| \`${route.method}\` | \`${API_BASE}${route.path}\` | ${route.secured ? "Yes" : "No"} | ${describe(route, resource)} |`,
      );
    }
  }

  lines.push(
    "",
    "### Static files",
    "",
    "| Method | Endpoint | Auth | Description |",
    "| --- | --- | --- | --- |",
    "| `GET` | `/uploads/<folder>/<file>` | No | Uploaded images |",
  );
  return lines.join("\n");
}

function packageTable(title, file) {
  const pkg = JSON.parse(read(file));
  const rows = [
    ...Object.entries(pkg.dependencies ?? {}).map(([name, version]) => [name, version, "dependency"]),
    ...Object.entries(pkg.devDependencies ?? {}).map(([name, version]) => [name, version, "dev"]),
  ].sort((a, b) => a[0].localeCompare(b[0]));

  return [
    `### ${title}`,
    "",
    `Source: \`${path.relative(ROOT, file)}\` · ${rows.length} packages`,
    "",
    "| Package | Version | Type | Used for |",
    "| --- | --- | --- | --- |",
    ...rows.map(([name, version, type]) => `| \`${name}\` | ${version} | ${type} | ${PURPOSES[name] ?? "—"} |`),
  ].join("\n");
}

function packagesSection() {
  return [
    packageTable("Backend", path.join(ROOT, "package.json")),
    packageTable("Frontend", path.join(ROOT, "frontend", "package.json")),
  ].join("\n\n");
}

function replaceSection(readme, name, content) {
  const start = `<!-- ${name}:START -->`;
  const end = `<!-- ${name}:END -->`;
  const block = `${start}\n${content}\n${end}`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
  return pattern.test(readme) ? readme.replace(pattern, block) : `${readme.trimEnd()}\n\n${block}\n`;
}

function main() {
  const current = fs.existsSync(README) ? read(README) : "# Multi Outlet Manager\n";
  const next = replaceSection(replaceSection(current, "API", apiSection()), "PACKAGES", packagesSection());
  if (next === current) return;
  fs.writeFileSync(README, next);
  console.log("README.md updated with the latest API and package list");
}

main();
