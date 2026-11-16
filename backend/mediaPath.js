// Keeps file access inside the preroll media folder (Settings > Location of Preroll Media).
// The bucket editor only ever asks for paths in that folder, but the backend must enforce it too,
// since anyone who can reach the port can call /backend/directory and /backend/streamer directly.
const fs = require("fs");
const path = require("path");
const { SETTINGS_FILE } = require("./paths");

/** The preroll media folder from settings, or null when it isn't set yet. */
function getMediaRoot() {
  try {
    const loc = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"))?.settings?.loc;
    return typeof loc === "string" && loc.trim() !== "" ? path.resolve(loc) : null;
  } catch {
    return null;
  }
}

/**
 * The absolute path if `requested` is the media folder or inside it, otherwise null.
 * The path is resolved first, so "/prerolls/../config/settings.js" is caught.
 */
function resolveInMediaRoot(requested) {
  const root = getMediaRoot();
  if (!root || typeof requested !== "string" || requested === "") return null;
  const target = path.resolve(requested);
  const inside = target === root || target.startsWith(root.endsWith(path.sep) ? root : root + path.sep);
  return inside ? target : null;
}

module.exports = { getMediaRoot, resolveInMediaRoot };
