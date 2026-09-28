require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const expressLimit = require("express-rate-limit");
const { ACCESS_DENIED, NOT_FOUND } = require("./routes/api_init_error");
const { UPLOAD_ROOT } = require("./controller/Upload");
const response = require("./controller/Response");
const { healthCheck } = require("./helper/Health_Check");
const { accessLog } = require("./helper/Access_Log");
const { registerShutdown } = require("./helper/Shutdown");
const { syncRoles } = require("./helper/Role_Access");

const PORT = process.env.PORT || 3050;
const JSON_BODY_LIMIT = "50kb";
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const limiter = expressLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY)
  app.set(
    "trust proxy",
    Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY,
  );
app.use(accessLog);
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        imgSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        sandbox: [],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: CORS_ORIGINS,
  }),
);
app.use(compression());
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use("/uploads", express.static(UPLOAD_ROOT, { maxAge: "7d" }));
app.get("/health", healthCheck);
app.use(limiter);

app.get("/", (req, res) => ACCESS_DENIED(res));
app.use("/api/v1/", require("./routes"));
app.use((req, res) => NOT_FOUND(res));

app.use((error, req, res, next) => {
  if (error.type === "entity.too.large") {
    return response.error(res, "Request body is too large!", 413);
  }
  if (error.type === "entity.parse.failed") {
    return response.error(res, "Request body is not valid JSON!", 400);
  }
  if (error.expose && error.status >= 400 && error.status < 500) {
    return response.error(res, error.message, error.status);
  }
  console.error(error);
  return response.error(res, "Something went wrong!", 500);
});

syncRoles().catch((error) => console.error("Role sync failed:", error));

// On Vercel the app runs as a serverless function (see api/index.js),
// so only open a port when running as a normal Node server.
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
    } else if (error.code === "EACCES") {
      console.error(`Permission denied to use port ${PORT}.`);
    } else {
      console.error("Server failed to start:", error);
    }

    process.exit(1);
  });

  registerShutdown(server);
}

module.exports = app;
