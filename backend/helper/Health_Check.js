const prisma = require("../config/prisma");

const HEALTH_TIMEOUT = 3000;

async function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function checkDatabase() {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, HEALTH_TIMEOUT, "Database health check timed out");
    return true;
  } catch (error) {
    console.error("Health check failed:", error.message);
    return false;
  }
}

function uptime() {
  return Math.round(process.uptime());
}

async function healthCheck(req, res) {
  res.set("Cache-Control", "no-store");

  if (!(await checkDatabase())) {
    return res.status(503).json({ status: "error", database: "down" });
  }

  return res.status(200).json({ status: "ok", database: "up", uptime: uptime() });
}

module.exports = { healthCheck, checkDatabase, withTimeout, uptime };
