var express = require("express");
var router = express.Router();
var fs = require("fs");

router.post("/", function (req, res, next) {
  try {
    console.info("Entering Directory: ", req.body.dir);
    dirData = fs.readdirSync(req.body.dir, { withFileTypes: true, recursive: req.body.isSub });
    dirRet = [];
    console.info("Directory read");

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

    dirData.forEach((file) => {
      dirRet.push({ name: file.name, isDir: file.isDirectory(), path: file.parentPath });
    });

    res.send(JSON.stringify(dirRet));
    console.debug(`Directory info: ${JSON.stringify(dirRet)}`);
  } catch (err) {
    console.error("Directory not found", err.message.split("\n")[0]);
    res.status(200).send(JSON.stringify(null));
  }
});

module.exports = router;
