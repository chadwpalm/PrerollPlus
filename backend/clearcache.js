var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");
const { CACHE_DIR } = require("./paths");
const log = require("./logger").tagged("HOLIDAY");

const cacheDir = CACHE_DIR;

function clearCache() {
  if (!fs.existsSync(cacheDir)) {
    log.warn(`Holiday cache folder does not exist: ${cacheDir}`);
    return { success: false, code: 404, message: "Cache directory does not exist" };
  }

  try {
    const files = fs.readdirSync(cacheDir);

    let deletedCount = 0;
    let failedCount = 0;

    files.forEach((file) => {
      const filePath = path.join(cacheDir, file);
      try {
        fs.unlinkSync(filePath);
        log.debug(`Deleted cache file ${file}`);
        deletedCount++;
      } catch (err) {
        log.error(`Could not delete cache file ${filePath}:`, err);
        failedCount++;
      }
    });

    log.info(
      `Holiday cache cleared: ${deletedCount} file(s) deleted${failedCount ? `, ${failedCount} could not be deleted` : ""}`,
    );

    return {
      success: true,
      code: 200,
      message: files.length ? "Cache directory cleared" : "Cache directory was already empty",
    };
  } catch (err) {
    log.error("Could not clear the holiday cache:", err);
    return { success: false, code: 500, message: err.message };
  }
}

router.get("/", function (req, res, next) {
  const result = clearCache();
  res.status(result.code).json(result);
});

module.exports = router;
