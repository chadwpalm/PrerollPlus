const express = require("express");
const path = require("path");
const fs = require("fs");
const mime = require("mime-types");
const router = express.Router();
const { resolveInMediaRoot } = require("./mediaPath");

const log = require("./logger").tagged("STREAMER");

router.get("/*splat", (req, res) => {
  // Express 5 named wildcard: the path segments after /backend/streamer/
  const requested = path.join("/", req.params.splat.join("/"));

  // Only files inside the preroll media folder can be streamed
  const filepath = resolveInMediaRoot(requested);
  if (!filepath) {
    log.warn(`Blocked a request for ${requested} from ${req.ip}: outside the preroll media folder`);
    return res.status(403).send("Forbidden");
  }

  // Check if file exists
  if (!fs.existsSync(filepath)) {
    log.warn(`Preview file not found: ${filepath}`);
    return res.status(404).send("File not found");
  }

  let stat;

  try {
    stat = fs.statSync(filepath);
  } catch (err) {
    log.error(`Could not read ${filepath}:`, err);
    return res.status(500).send("Internal server error");
  }

  if (!stat.isFile()) {
    return res.status(404).send("File not found");
  }

  const fileSize = stat.size;
  const range = req.headers.range;

  const contentType = mime.lookup(filepath) || "application/octet-stream";

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || start < 0 || start >= fileSize) {
      log.debug(`Range ${range} not satisfiable for ${filepath} (${fileSize} bytes)`);
      res.status(416).send("Requested range not satisfiable");
      return;
    }

    if (end >= fileSize) end = fileSize - 1;
    const chunkSize = end - start + 1;

    log.debug(`Streaming ${filepath} bytes ${start}-${end}/${fileSize}`);

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
      log.error(`Streaming ${filepath} failed:`, err);
    });
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": contentType,
    };

    log.debug(`Streaming ${filepath} (${fileSize} bytes)`);
    res.writeHead(200, head);

    const stream = fs.createReadStream(filepath);
    stream.pipe(res);

    stream.on("error", (err) => {
      log.error(`Streaming ${filepath} failed:`, err);
    });
  }
});

module.exports = router;
