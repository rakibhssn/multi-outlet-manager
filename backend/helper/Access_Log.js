const SKIP_PATHS = ["/health"];

function durationMs(start) {
  return Number(process.hrtime.bigint() - start) / 1e6;
}

function requestPath(req) {
  return req.originalUrl.split("?")[0];
}

function shouldSkip(req, res) {
  return SKIP_PATHS.includes(requestPath(req)) && res.statusCode < 400;
}

function formatEntry(req, res, start, aborted) {
  const parts = [
    new Date().toISOString(),
    req.method,
    requestPath(req),
    aborted ? "aborted" : res.statusCode,
    `${durationMs(start).toFixed(1)}ms`,
    req.ip,
  ];
  if (req.user?.userId) parts.push(`user=${req.user.userId}`);
  return parts.join(" ");
}

function writeEntry(res, entry) {
  if (res.statusCode >= 500) return console.error(entry);
  return console.log(entry);
}

function accessLog(req, res, next) {
  const start = process.hrtime.bigint();
  let logged = false;

  const log = (aborted) => {
    if (logged || shouldSkip(req, res)) return;
    logged = true;
    writeEntry(res, formatEntry(req, res, start, aborted));
  };

  res.on("finish", () => log(false));
  res.on("close", () => log(!res.writableFinished));

  next();
}

module.exports = { accessLog, formatEntry, durationMs, requestPath, shouldSkip };
