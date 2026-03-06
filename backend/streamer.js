const express = require("express");
const path = require("path");
const fs = require("fs");
const mime = require("mime-types");
const router = express.Router();

const LOG_TAG = "[STREAMER]";

router.get("/*", (req, res) => {
  const filename = req.params[0];
  const filepath = path.join("/", filename);

  console.debug(`${LOG_TAG} Serving request: ${req.method} ${req.originalUrl} from ${req.ip || "unknown"}`);

  // Check if file exists
  if (!fs.existsSync(filepath)) {
    console.warn(`${LOG_TAG} File not found: ${filepath}`);
    return res.status(404).send("File not found");
  }

  let stat;

  try {
    stat = fs.statSync(filepath);
  } catch (err) {
    console.error(`${LOG_TAG} Stat failed for ${filepath}: ${err.message}`);
    return res.status(500).send("Internal server error");
  }

  const fileSize = stat.size;
  const range = req.headers.range;

  const contentType = mime.lookup(filepath) || "application/octet-stream";

  console.debug(`${LOG_TAG} Serving ${filepath} (${fileSize} bytes, type: ${contentType})`);

  if (range) {
    console.debug(`${LOG_TAG} Range request detected: ${range}`);

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || start < 0 || start >= fileSize) {
      console.warn(`${LOG_TAG} Invalid range start: ${start} for file size ${fileSize}`);
      res.status(416).send("Requested range not satisfiable");
      return;
    }

    if (end >= fileSize) end = fileSize - 1;
    const chunkSize = end - start + 1;

    console.debug(`${LOG_TAG} Range: ${start}-${end}/${fileSize} (${chunkSize} bytes)`);

    const file = fs.createReadStream(filepath, { start, end });

    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType,
    };

    res.writeHead(206, head);
    file.pipe(res);

    file.on("error", (err) => {
      console.error(`${LOG_TAG} Stream error during range serve: ${err.message}`);
    });
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": contentType,
    };

    res.writeHead(200, head);

    const stream = fs.createReadStream(filepath);
    stream.pipe(res);

    stream.on("error", (err) => {
      console.error(`${LOG_TAG} Stream error during full serve: ${err.message}`);
    });
  }

  res.on("finish", () => {
    console.debug(`${LOG_TAG} Response finished for ${filepath}`);
  });
});

module.exports = router;
