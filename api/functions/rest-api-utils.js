"use strict";

const HEADERS = {
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};

const _successHandler = (callback, responseBody) => {
  const response = {
    statusCode: 200
  };
  let headers = HEADERS;
  if (
    responseBody !== undefined &&
    responseBody !== null &&
    typeof responseBody != "string" &&
    typeof responseBody != "number"
  ) {
    try {
      responseBody = JSON.stringify(responseBody);
      response["body"] = responseBody;
    } catch (error) {
      console.error(error);
    }
  } else {
    response["body"] = responseBody;
    delete headers["Content-Type"];
  }
  response["headers"] = headers;
  callback(null, response);
};
module.exports.successHandler = _successHandler;

const _errorHandler = (callback, statusCode, errorCode, error) => {
  console.error(errorCode);
  if (error !== undefined && error !== null) console.error(error);
  callback(null, {
    statusCode: statusCode,
    headers: HEADERS,
    body: JSON.stringify({
      errorCode: errorCode
    })
  });
};
module.exports.errorHandler = _errorHandler;

const _xssSanitizer = untrustedString => {
  return String(untrustedString).replace(/[&<>]/g, function(c) {
    return "&#" + c.charCodeAt(0) + ";";
  });
};
module.exports.xssSanitizer = _xssSanitizer;
