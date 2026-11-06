var express = require("express");
var router = express.Router();
var fs = require("fs");
const { resolveInMediaRoot } = require("./mediaPath");
const log = require("./logger").tagged("DIRECTORY");

// System and hidden files (macOS, Windows, Synology) that never belong in a bucket
function isHidden(entry) {
  const name = entry.name;
  return (
    name.startsWith(".") ||
    name.startsWith("@") ||
    name === "Thumbs.db" ||
    name === "desktop.ini" ||
    entry.parentPath?.includes("@eaDir")
  );
}

/**
 * Folders first, then files, each sorted by name: [{ name, isDir, path }] (path = the containing folder).
 * Returns null if the folder can't be read. Throws an error with code "OUTSIDE_MEDIA_FOLDER" for folders
 * outside the preroll media folder.
 */
function listDirectory(requested, includeSub = false) {
  // Only folders inside the preroll media folder can be listed
  const dir = resolveInMediaRoot(requested);
  if (!dir) {
    const err = new Error(`${requested} is outside the preroll media folder`);
    err.code = "OUTSIDE_MEDIA_FOLDER";
    throw err;
  }

  try {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true, recursive: !!includeSub })
      .filter((entry) => !isHidden(entry))
      .sort((a, b) => {
        const aIsDir = a.isDirectory();
        const bIsDir = b.isDirectory();
        if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
        return String(a.name).toLowerCase().localeCompare(String(b.name).toLowerCase());
      })
      .map((entry) => ({ name: entry.name, isDir: entry.isDirectory(), path: entry.parentPath }));

    log.debug(`Listed ${dir}${includeSub ? " and subfolders" : ""}: ${entries.length} entries`);
    return entries;
  } catch (err) {
    log.warn(`Could not list folder ${dir}: ${err.message.split("\n")[0]}`);
    return null;
  }
}

router.post("/", function (req, res, next) {
  try {
    res.json(listDirectory(req.body?.dir, req.body?.isSub));
  } catch (err) {
    if (err.code !== "OUTSIDE_MEDIA_FOLDER") return next(err);
    log.warn(`Blocked listing ${req.body?.dir} from ${req.ip}: outside the preroll media folder`);
    res.status(403).json({ error: "Folder is outside the preroll media folder" });
  }
});

module.exports = router;
module.exports.listDirectory = listDirectory;
