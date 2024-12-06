var express = require("express");
var router = express.Router();
var fs = require("fs");
var axios = require("axios").default;

router.post("/", async function (req, res, next) {
  console.log(req.body.country);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();

  let data;

  var url = `https://date.nager.at/api/v3/publicholidays/${currentYear}/${req.body.country}`;

  await axios
    .get(url, {
      timeout: 2000,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
      },
    })
    .then(function (response) {
      data = JSON.stringify(response.data);
    })
    .catch(function (error) {
      console.error("Error while trying to connect to the Public Holiday API: ", error.message);
    });

  res.send(data);
});

module.exports = router;
