var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");

const cacheDir = path.join("/", "config", "cache");

function clearCache() {
  if (!fs.existsSync(cacheDir)) {
    console.info(`Cache directory does not exist: ${cacheDir}`);
    return { success: false, code: 404, message: "Cache directory does not exist" };
  }

  try {
    const files = fs.readdirSync(cacheDir);
    files.forEach((file) => {
      const filePath = path.join(cacheDir, file);
      try {
        fs.unlinkSync(filePath);
        console.info(`Deleted: ${filePath}`);
      } catch (err) {
        console.error(`Failed to delete ${filePath}:`, err.message);
        throw err; // bubble up to outer catch
      }
    });
    console.info("Cache directory cleared.");
    return { success: true, code: 200, message: "Cache directory cleared" };
  } catch (err) {
    console.error("Error reading/deleting cache directory:", err.message);
    return { success: false, code: 500, message: err.message };
  }
}

router.get("/", function (req, res, next) {
  const result = clearCache();
  res.status(result.code).json(result);
});

module.exports = router;
