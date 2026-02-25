var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");

const cacheDir = path.join("/", "config", "cache");
const LOG_TAG = "[CLEARCACHE]";

function clearCache() {
  console.log(`${LOG_TAG} Clear cache requested`);

  if (!fs.existsSync(cacheDir)) {
    console.warn(`${LOG_TAG} Cache directory does not exist: ${cacheDir}`);
    return { success: false, code: 404, message: "Cache directory does not exist" };
  }

  try {
    const files = fs.readdirSync(cacheDir);

    console.info(`${LOG_TAG} Found ${files.length} file(s) in cache directory`);
    console.debug(`${LOG_TAG} Files found: ${files} `);

    if (files.length === 0) {
      console.info(`${LOG_TAG} Cache directory is already empty`);
      return { success: true, code: 200, message: "Cache directory was already empty" };
    }

    let deletedCount = 0;
    let failedCount = 0;

    files.forEach((file) => {
      const filePath = path.join(cacheDir, file);
      try {
        fs.unlinkSync(filePath);
        console.info(`${LOG_TAG} Deleted: ${filePath}`);
        deletedCount++;
      } catch (err) {
        console.error(`${LOG_TAG} Failed to delete ${filePath}:`, err.message);
        if (err.code) console.error(`${LOG_TAG} Error code: ${err.code}`);
        failedCount++;
      }
    });

    console.info(`${LOG_TAG} Cache clear complete: ${deletedCount} deleted, ${failedCount} failed`);

    return { success: true, code: 200, message: "Cache directory cleared" };
  } catch (err) {
    console.error(`${LOG_TAG} Fatal error reading/deleting cache directory: ${err.message}`);
    if (err.code) console.error(`${LOG_TAG} Error code: ${err.code}`);
    if (err.stack) console.debug(`${LOG_TAG} Stack: ${err.stack}`);
    return { success: false, code: 500, message: err.message };
  }
}

router.get("/", function (req, res, next) {
  console.debug(`${LOG_TAG} GET /clear-cache triggered from ${req.ip || "unknown IP"}`);
  const result = clearCache();
  res.status(result.code).json(result);
  console.debug(`${LOG_TAG} Response sent: success=${result.success}, code=${result.code}`);
});

module.exports = router;
