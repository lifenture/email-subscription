"use strict";

const _AWSXRay = require("aws-xray-sdk-core");
const _AWS = _AWSXRay.captureAWS(require("aws-sdk"));

module.exports.AWS = _AWS;
