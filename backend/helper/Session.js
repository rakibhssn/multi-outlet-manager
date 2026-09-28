const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

const ACCESS_TOKEN_EXPIRES = "1h";
const ACCESS_TOKEN_SECONDS = 3600;
const SESSION_MS = 24 * 60 * 60 * 1000;
const TOUCH_MS = 5 * 60 * 1000;

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const sessionExpiry = () => new Date(Date.now() + SESSION_MS);

const invalidSession = () => Object.assign(new Error("Your session has ended. Please sign in again."), { status: 401 });

function accessTokenFor(userId, sessionId) {
  return jwt.sign({ userId, sid: sessionId, type: "access" }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });
}

function refreshTokenFor(userId, sessionId) {
  return jwt.sign(
    { userId, sid: sessionId, type: "refresh", jti: crypto.randomBytes(16).toString("hex") },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: Math.floor(SESSION_MS / 1000) },
  );
}

function tokenPair(userId, sessionId) {
  const refreshToken = refreshTokenFor(userId, sessionId);
  return {
    accessToken: accessTokenFor(userId, sessionId),
    refreshToken,
    refreshTokenHash: hashToken(refreshToken),
    expiresIn: ACCESS_TOKEN_SECONDS,
  };
}

function clientOf(req) {
  return { userAgent: String(req.get("user-agent") ?? "").slice(0, 255) || null, ip: req.ip ?? null };
}

async function startSession(userId, req) {
  const id = crypto.randomUUID();
  const { refreshTokenHash, ...tokens } = tokenPair(userId, id);
  await prisma.userSession.create({
    data: { id, userId, refreshTokenHash, expiresAt: sessionExpiry(), ...clientOf(req) },
  });
  return tokens;
}

function readRefreshToken(token) {
  try {
    const payload = jwt.verify(String(token ?? ""), process.env.JWT_REFRESH_SECRET);
    return payload?.type === "refresh" && payload.sid ? payload : null;
  } catch {
    return null;
  }
}

async function rotateSession(refreshToken, req) {
  const payload = readRefreshToken(refreshToken);
  if (!payload) throw invalidSession();

  const session = await prisma.userSession.findUnique({
    where: { id: payload.sid },
    select: { id: true, userId: true, refreshTokenHash: true, revokedAt: true, expiresAt: true, user: { select: { status: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date() || session.user.status !== "ACTIVE") {
    throw invalidSession();
  }
  if (session.refreshTokenHash !== hashToken(refreshToken)) {
    await revokeSession(session.id);
    throw invalidSession();
  }

  const { refreshTokenHash, ...tokens } = tokenPair(session.userId, session.id);
  await prisma.userSession.update({
    where: { id: session.id },
    data: { refreshTokenHash, expiresAt: sessionExpiry(), lastUsedAt: new Date(), ...clientOf(req) },
  });
  return tokens;
}

function activeSessionWhere(userId) {
  return { userId, revokedAt: null, expiresAt: { gt: new Date() } };
}

function revokeSession(id) {
  return prisma.userSession.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
}

function revokeOtherSessions(userId, keepId) {
  return prisma.userSession.updateMany({
    where: { ...activeSessionWhere(userId), id: { not: keepId } },
    data: { revokedAt: new Date() },
  });
}

function revokeAllSessions(userId, client = prisma) {
  return client.userSession.updateMany({ where: activeSessionWhere(userId), data: { revokedAt: new Date() } });
}

function isSessionLive(session, userId) {
  return !!session && session.userId === userId && !session.revokedAt && session.expiresAt > new Date();
}

function touchSession(session) {
  if (Date.now() - session.lastUsedAt.getTime() < TOUCH_MS) return;
  prisma.userSession
    .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);
}

module.exports = {
  startSession,
  rotateSession,
  revokeSession,
  revokeOtherSessions,
  revokeAllSessions,
  activeSessionWhere,
  isSessionLive,
  touchSession,
};
