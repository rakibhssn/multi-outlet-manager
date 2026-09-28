const prisma = require("../config/prisma");

const SHUTDOWN_TIMEOUT = 10000;
const CRASH_TIMEOUT = 5000;

let shuttingDown = false;

function forceExit(ms) {
  const timer = setTimeout(() => {
    console.error("Forced shutdown.");
    process.exit(1);
  }, ms);
  timer.unref();
  return timer;
}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server.listening) return resolve();
    server.close((error) => {
      if (error) console.error("HTTP server close failed:", error.message);
      else console.log("HTTP server closed.");
      resolve();
    });
    server.closeIdleConnections();
  });
}

async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log("Database disconnected.");
  } catch (error) {
    console.error("Database disconnect failed:", error.message);
  }
}

async function shutdown(server, { reason, code, timeout }) {
  if (shuttingDown) {
    console.error(`${reason} received during shutdown. Exiting now.`);
    return process.exit(code || 1);
  }
  shuttingDown = true;
  console.log(`${reason} received. Shutting down...`);

  forceExit(timeout);
  await closeServer(server);
  await disconnectDatabase();
  process.exit(code);
}

function onSignal(server, signal) {
  return () => shutdown(server, { reason: signal, code: 0, timeout: SHUTDOWN_TIMEOUT });
}

function onCrash(server, label) {
  return (error) => {
    console.error(`${label}:`, error);
    shutdown(server, { reason: label, code: 1, timeout: CRASH_TIMEOUT });
  };
}

function registerShutdown(server) {
  process.on("SIGTERM", onSignal(server, "SIGTERM"));
  process.on("SIGINT", onSignal(server, "SIGINT"));
  process.on("uncaughtException", onCrash(server, "Uncaught Exception"));
  process.on("unhandledRejection", onCrash(server, "Unhandled Promise Rejection"));
}

module.exports = { registerShutdown, shutdown, closeServer, disconnectDatabase, forceExit };
