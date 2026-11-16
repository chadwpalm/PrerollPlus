// Who may use the web pages and the /backend API.
//
// Signing in is done with Plex: the browser gets a Plex token from the Plex sign-in popup and sends it to
// POST backend/auth/login. The server asks plex.tv which account the token belongs to and only accepts the
// owner (the account that first set up Preroll Plus, saved as `ownerId`). The owner's browser then gets a
// signed session cookie, checked on every request.
//
// Settings > Security > Authentication (settings.authMode):
//   "required" (default)  every browser must sign in
//   "local"               browsers on the local network don't need to sign in
//   "off"                 no sign-in (e.g. the reverse proxy already requires a login)
// The DISABLE_AUTH=true environment variable forces "off" and lets a different Plex account take over as
// owner on its next sign-in (recovery when the owner can't sign in any more).
//
// Not covered here on purpose: POST /webhook (Plex can't sign in, and it only picks new prerolls) and
// /feed (protected by the iCal API key).
const crypto = require("crypto");
const express = require("express");
const axios = require("axios").default;
const parser = require("xml-js");
const proxyaddr = require("proxy-addr");
const store = require("./settingsStore");
const logger = require("./logger");
const { getBaseURL } = require("./config");
const log = logger.tagged("AUTH");

const COOKIE_NAME = "prerollplus_session";
const SESSION_DAYS = 30;
const RENEW_DAYS = 15; // sessions with less than this left are renewed on use
const DAY_MS = 24 * 60 * 60 * 1000;
const MODES = ["required", "local", "off"];

// Loopback, link-local and private (RFC 1918 / IPv6 unique local) addresses. Used both to decide which
// proxies' X-Forwarded-For headers to believe and which clients count as "local".
const TRUST_PROXY = ["loopback", "linklocal", "uniquelocal"];
const isTrustedAddress = proxyaddr.compile(TRUST_PROXY);

const envDisabled = /^(1|true|yes)$/i.test(process.env.DISABLE_AUTH || "");
if (envDisabled) log.warn("DISABLE_AUTH is set: anyone who can reach Preroll Plus can use it without signing in");

function readSettings() {
  try {
    return store.read();
  } catch (err) {
    log.error("Could not read settings:", err);
    return {};
  }
}

/** The authentication mode in effect and whether an environment variable set it. */
function getMode(settings = readSettings()) {
  if (envDisabled) return { mode: "off", source: "DISABLE_AUTH" };
  const mode = settings.settings?.authMode;
  return { mode: MODES.includes(mode) ? mode : "required", source: "settings" };
}

/** The client's address, using X-Forwarded-For only when it was added by a proxy on the local network. */
function clientAddress(req) {
  try {
    return proxyaddr(req, isTrustedAddress);
  } catch {
    return req.socket?.remoteAddress || "";
  }
}

function isLocalRequest(req) {
  const ip = clientAddress(req);
  return !!ip && isTrustedAddress(ip, 0);
}

// Session cookie: "<expiry ms>.<HMAC of owner id and expiry>". Changing the owner or the secret ends all sessions.
function sign(secret, ownerId, expires) {
  return crypto.createHmac("sha256", secret).update(`${ownerId}.${expires}`).digest("base64url");
}

function readCookie(req) {
  const header = req.headers?.cookie || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i !== -1 && part.slice(0, i).trim() === COOKIE_NAME) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/** The session's expiry time if the request carries a valid owner session, otherwise null. */
function sessionExpiry(req, settings) {
  const value = readCookie(req);
  if (!value || !settings.ownerId || !settings.sessionSecret) return null;
  const [expires, signature] = value.split(".");
  const exp = Number(expires);
  if (!Number.isFinite(exp) || exp < Date.now() || !signature) return null;
  const expected = sign(settings.sessionSecret, settings.ownerId, exp);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? exp : null;
}

function cookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure, // true behind an HTTPS reverse proxy on the local network ("trust proxy" in app.js)
    path: getBaseURL() + "/",
  };
}

function setSessionCookie(req, res, settings) {
  const expires = Date.now() + SESSION_DAYS * DAY_MS;
  res.cookie(COOKIE_NAME, `${expires}.${sign(settings.sessionSecret, settings.ownerId, expires)}`, {
    ...cookieOptions(req),
    maxAge: SESSION_DAYS * DAY_MS,
  });
}

/** Whether this request may use the app, and why. Works on Express requests and raw upgrade requests. */
function checkAccess(req, settings = readSettings()) {
  const { mode } = getMode(settings);
  const exp = sessionExpiry(req, settings);
  if (exp) return { allowed: true, signedIn: true, exp };
  if (mode === "off") return { allowed: true, signedIn: false };
  if (mode === "local" && isLocalRequest(req)) return { allowed: true, signedIn: false };
  return { allowed: false, signedIn: false };
}

/** Express middleware: 401 unless the request is allowed. Renews sessions that are getting old. */
function requireAuth(req, res, next) {
  const settings = readSettings();
  const access = checkAccess(req, settings);
  if (!access.allowed) return res.status(401).json({ error: "Sign in to Preroll Plus to continue" });
  if (access.exp && access.exp - Date.now() < RENEW_DAYS * DAY_MS) setSessionCookie(req, res, settings);
  next();
}

/** For the WebSocket server: may this upgrade request connect? */
function allowUpgrade(req) {
  return checkAccess(req).allowed;
}

/** The Plex account a token belongs to (from plex.tv). Throws if plex.tv rejects it or can't be reached. */
async function getPlexAccount(token) {
  const response = await axios.get("https://plex.tv/users/account", {
    timeout: 10000,
    params: { "X-Plex-Token": token },
  });
  const user = parser.xml2js(response.data, { compact: true }).user._attributes;
  return { id: String(user.id), username: user.username, email: user.email, thumb: user.thumb };
}

/**
 * Settings from before 1.6.0 have a Plex token but no owner: the owner is whoever that token belongs to.
 * Called at startup and before a sign-in, so nobody else can claim an existing install.
 */
async function resolveOwnerFromToken() {
  const settings = readSettings();
  if (settings.ownerId || !settings.token) return settings.ownerId || null;
  try {
    const account = await getPlexAccount(settings.token);
    store.update((s) => {
      if (!s.ownerId) s.ownerId = account.id;
    });
    log.info(`Plex account "${account.username}" set as the owner from the saved sign-in`);
    return account.id;
  } catch (err) {
    log.warn("Could not look up the owner of the saved Plex sign-in:", err);
    return null;
  }
}

const router = express.Router();

// Public: what the sign-in page needs (Plex popup client details) and whether this browser is let in
router.get("/status", (req, res) => {
  const settings = readSettings();
  const { mode, source } = getMode(settings);
  const access = checkAccess(req, settings);
  // The app needs a working Plex sign-in: none yet (new install) or Plex rejected the saved one
  const plexSignInNeeded = !settings.token || settings.plexSignInNeeded === true;
  res.json({
    allowed: access.allowed && !plexSignInNeeded,
    signedIn: access.signedIn,
    plexSignInNeeded,
    authMode: mode,
    authModeSource: source,
    uuid: settings.uuid,
    platform: settings.platform,
    version: settings.version,
    branch: settings.branch,
    build: settings.build,
  });
});

router.post("/login", async (req, res) => {
  const token = req.body?.token;
  if (typeof token !== "string" || token === "") return res.status(400).json({ error: "No Plex token" });

  let account;
  try {
    account = await getPlexAccount(token);
  } catch (err) {
    log.warn("Sign-in failed, plex.tv did not accept the token:", err);
    return res.status(502).json({ error: "Could not confirm the Plex account with plex.tv. Try again." });
  }

  const ownerId = (await resolveOwnerFromToken()) || readSettings().ownerId;
  if (ownerId && ownerId !== account.id && !envDisabled) {
    log.warn(`Sign-in refused for Plex account "${account.username}" (not the owner)`);
    return res
      .status(403)
      .json({
        error: `The Plex account "${account.username}" doesn't have access to this Preroll Plus.`,
        username: account.username,
      });
  }

  const settings = store.update((s) => {
    if (s.ownerId !== account.id) {
      log.info(
        s.ownerId
          ? `Plex account "${account.username}" is now the owner (DISABLE_AUTH is set)`
          : `Plex account "${account.username}" set as the owner`,
      );
    }
    s.ownerId = account.id;
    s.token = token;
    s.username = account.username;
    s.email = account.email;
    s.thumb = account.thumb;
    if (!s.sessionSecret) s.sessionSecret = crypto.randomBytes(32).toString("hex");
    delete s.plexSignInNeeded;
  });
  logger.reload(); // new token and email to mask in the logs

  setSessionCookie(req, res, settings);
  log.info(`Signed in as "${account.username}" from ${clientAddress(req)}`);
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions(req));
  res.json({ ok: true });
});

module.exports = { router, requireAuth, allowUpgrade, resolveOwnerFromToken, TRUST_PROXY };
