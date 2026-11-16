// The one place the backend reads and writes settings.js.
//
// - read() always returns a fresh copy from disk.
// - update(fn) reads, lets fn change the copy, and writes it back in one synchronous step, so no other
//   code can run in between. Use it to change a few fields (e.g. currentSeq) without overwriting edits
//   that were saved since some other copy of the settings was read.
// - write(obj) replaces the whole file (the Settings/Sequences/Buckets pages save the full object).
//
// The file is written in place (not replaced) so its owner set from PUID/PGID is kept.
const fs = require("fs");
const { SETTINGS_FILE } = require("./paths");

function read() {
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
}

function write(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings));
}

function update(fn) {
  const settings = read();
  fn(settings);
  write(settings);
  return settings;
}

module.exports = { read, write, update };
