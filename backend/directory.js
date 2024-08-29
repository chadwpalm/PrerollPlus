var express = require("express");
var router = express.Router();
var fs = require("fs");

router.post("/", function (req, res, next) {
  try {
    console.info("Entering Directory: ", req.body.dir);
    dirData = fs.readdirSync(req.body.dir, { withFileTypes: true });
    dirRet = [];
    console.info("Directory read");

    dirData.sort((a, b) => {
      const aIsDir = a.isDirectory();
      const bIsDir = b.isDirectory();

      if (aIsDir && !bIsDir) {
        return -1; // a comes before b
      } else if (!aIsDir && bIsDir) {
        return 1; // b comes before a
      } else {
        const aStr = String(a.name).toLowerCase();
        const bStr = String(b.name).toLowerCase();
        return aStr.localeCompare(bStr); // regular alphabetical sort
      }
    });

    dirData.forEach((file) => {
      dirRet.push({ name: file.name, isDir: file.isDirectory() });
    });
  } catch (err) {
    console.info("Directory not found", err);
  }

  res.send(JSON.stringify(dirRet));
});

module.exports = router;
