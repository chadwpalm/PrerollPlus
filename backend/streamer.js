const express = require("express");
const path = require("path");
const fs = require("fs");
const mime = require("mime-types");
const router = express.Router();

router.get("/*", (req, res) => {
  const filename = req.params[0];
  const filepath = path.join("/", filename);

  // Check if file exists
  if (!fs.existsSync(filepath)) {
    return res.status(404).send("File not found");
  }

  const stat = fs.statSync(filepath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const contentType = mime.lookup(filepath) || "application/octet-stream"; // Default to generic binary stream

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filepath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": contentType,
    };

    res.writeHead(200, head);
    fs.createReadStream(filepath).pipe(res);
  }
});

module.exports = router;
