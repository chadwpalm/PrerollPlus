var express = require("express");
var router = express.Router();
var fs = require("fs");

const LOG_TAG = "[DIRECTORY]";

router.post("/", function (req, res, next) {
  try {
    console.info(`${LOG_TAG} Entering Directory: ${req.body.dir}`);
    const dirData = fs.readdirSync(req.body.dir, { withFileTypes: true, recursive: !!req.body.isSub });

    console.info(`${LOG_TAG} Directory read`);

    const filteredData = dirData.filter((entry) => {
      const name = entry.name;
      if (
        name.startsWith(".") ||
        name.startsWith("@") ||
        name === "Thumbs.db" ||
        name === "desktop.ini" ||
        entry.parentPath?.includes("@eaDir")
      ) {
        return false;
      }
      return true;
    });

    dirData.sort((a, b) => {
      const aIsDir = a.isDirectory();
      const bIsDir = b.isDirectory();

      if (aIsDir && !bIsDir) {
        return -1;
      } else if (!aIsDir && bIsDir) {
        return 1;
      } else {
        const aStr = String(a.name).toLowerCase();
        const bStr = String(b.name).toLowerCase();
        return aStr.localeCompare(bStr);
      }
    });

    const dirRet = [];
    filteredData.forEach((file) => {
      dirRet.push({
        name: file.name,
        isDir: file.isDirectory(),
        path: file.parentPath,
      });
    });

    console.debug(
      `${LOG_TAG} Filtered & sorted directory contents${!!req.body.isSub ? " (including subdirectories)" : ""}:\n${JSON.stringify(dirRet, null, 2)}`,
    );

    res.send(JSON.stringify(dirRet));
  } catch (err) {
    console.error(`${LOG_TAG} Directory not found ${err.message.split("\n")[0]}`);
    res.status(200).send(JSON.stringify(null));
  }
});

module.exports = router;
