const express = require("express");
const cors = require("cors");
const expressLimit = require("express-rate-limit");
const { ACCESS_DENIED } = require("./routes/api_init_error");

const PORT = process.env.PORT || 3050;
const limiter = expressLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const app = express();
app.disable("x-powered-by");
app.use(cors());
app.use(express.json());

app.use(limiter);

app.get("/", (req, res) => ACCESS_DENIED(res));
app.use("/api/v1/", require("./routes"));

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

// Handle unexpected errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);

  server.close(() => {
    process.exit(1);
  });
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Promise Rejection:", error);

  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down...`);

  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forced shutdown.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
