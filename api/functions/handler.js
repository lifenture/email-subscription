"use strict";

const { AWS } = require("/opt/aws-utils");

const {
  errorHandler,
  successHandler,
  xssSanitizer
} = require("./rest-api-utils");
const { randomString } = require("./cipher-utils");

const ERRORS = {
  InvalidEmail: "ErrorInvalidEmail",
  InvalidName: "ErrorInvalidName",
  InvalidSubscriberId: "ErrorInvalidSubscriberId",
  NotQueued: "ErrorSubscriptionNotAdded"
};

const sns = new AWS.SNS({ apiVersion: "2010-03-31" });

let theCallback = null;

module.exports.subscriptionAdd = (event, context, callback) => {
  theCallback = callback;
  const data = JSON.parse(event.body) || {};

  if (!isEmailValid(data.email)) {
    errorHandler(callback, 400, ERRORS.InvalidEmail, data.email);
    return;
  }
  if (!notNullOrEmpty(data.firstName)) {
    errorHandler(callback, 400, ERRORS.InvalidName, data.firstName);
    return;
  }
  const subscriptionData = buildSubscriptionData(data);
  publishToSns(JSON.stringify(subscriptionData), "addSubscription");
};

module.exports.subscriptionDelete = (event, context, callback) => {
  theCallback = callback;
  const data = event.pathParameters || {};

  if (!notNullOrEmpty(data.subscriptionId)) {
    errorHandler(
      callback,
      400,
      ERRORS.InvalidSubscriberId,
      data.subscriptionId
    );
    return;
  }
  publishToSns(xssSanitizer(data.subscriptionId), "deleteSubscription");
};

const isEmailValid = email => {
  if (!notNullOrEmpty(email)) return false;

  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (!re.test(email)) return false;

  return true;
};

const notNullOrEmpty = value => {
  return value !== undefined && value !== null && value.trim() != "";
};

const buildSubscriptionData = data => {
  let subscriptionData = {
    subscriptionId: randomString(),
    email: xssSanitizer(data.email.trim().toLowerCase()),
    firstName: xssSanitizer(data.firstName.trim())
  };
  if (!notNullOrEmpty(process.env.DataFields)) return subscriptionData;
  Object.keys(process.env.DataFields).forEach(key => {
    if (notNullOrEmpty(data[key])) {
      subscriptionData[key] = xssSanitizer(data[key].trim());
    }
  });
  return subscriptionData;
};

const publishToSns = (message, eventName) => {
  const params = {
    Message: message,
    TopicArn: process.env.SnsTopicArn,
    MessageAttributes: {
      event: {
        DataType: "String",
        StringValue: eventName
      }
    }
  };
  sns
    .publish(params)
    .promise()
    .then(
      result => {
        console.log(
          eventName + ":" + message + ";SNS message id:" + result.MessageId
        );
        successHandler(theCallback);
      },
      error => {
        console.error(eventName + ":" + message);
        errorHandler(theCallback, 400, ERRORS.NotQueued, error);
      }
    );
};
