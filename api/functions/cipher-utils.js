"use strict";

const cryptoRandomString = require("crypto-random-string");

const _randomString = length => {
  return cryptoRandomString({
    length:
      length !== undefined && length !== null && Number.isInteger(length)
        ? length
        : 10,
    type: "url-safe"
  });
};
module.exports.randomString = _randomString;
