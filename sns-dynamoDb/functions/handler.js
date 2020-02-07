"use strict";

const { AWS } = require("/opt/aws-utils");

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.subscriptionAddDb = event => {
  const snsMsg = event.Records[0].Sns;
  let item = JSON.parse(snsMsg.Message);
  item["createdAt"] = new Date().getTime();

  const paramsDB = {
    TableName: process.env.dynamoDbTable,
    Item: item
  };

  dynamoDb
    .put(paramsDB)
    .promise()
    .then(
      result =>
        console.log(
          "Subscription saved:" +
            item.email +
            ";SNS message id:" +
            snsMsg.MessageId
        ),
      error =>
        console.error(
          "Subscription NOT saved:" +
            item.email +
            ";SNS message id:" +
            snsMsg.MessageId +
            ";" +
            error
        )
    );
};

module.exports.subscriptionDeleteDb = event => {
  const snsMsg = event.Records[0].Sns;
  let paramsDB = {
    TableName: process.env.dynamoDbTable,
    ProjectionExpression: "email",
    FilterExpression: "subscriptionId = :subscriptionId",
    ExpressionAttributeValues: {
      ":subscriptionId": snsMsg.Message
    }
  };
  let deletePromises = [];
  dynamoDb
    .scan(paramsDB)
    .promise()
    .then(
      data => {
        paramsDB = {
          TableName: process.env.dynamoDbTable,
          Key: {
            email: null
          }
        };
        data.Items.forEach(subscription => {
          paramsDB.Key.email = subscription.email;
          deletePromises.push(dynamoDb.delete(paramsDB).promise());
        });
      },
      error =>
        console.error(
          "Subscription NOT deleted:" +
            snsMsg.Message +
            ";SNS message id:" +
            snsMsg.MessageId +
            ";" +
            error
        )
    );
  Promise.all(deletePromises).then(data =>
    console.log(
      "Subscription deleted:" +
        snsMsg.Message +
        ";SNS message id:" +
        snsMsg.MessageId
    )
  );
};
