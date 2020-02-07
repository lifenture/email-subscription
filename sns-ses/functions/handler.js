"use strict";

const { AWS } = require("/opt/aws-utils");

const handlebars = require("handlebars");
const nodemailer = require("nodemailer");

const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

module.exports.subscriptionAddMail = async event => {
  const snsMsg = event.Records[0].Sns;
  let item = JSON.parse(snsMsg.Message);

  const mailConfig = await getMailConfig();

  if (mailConfig === null) {
    consoleError(item.email, snsMsg.MessageId);
    return;
  }

  const mailBody = await getMailBody(mailConfig.bodyFileName);
  if (mailBody === null) {
    consoleError(item.email, snsMsg.MessageId);
    return;
  }

  await sendMail(mailConfig, mailBody, item, snsMsg.MessageId);
};

const getMailConfig = async () => {
  const mailConfigDir = process.env.ConfigDir + "/default";
  let params = {
    Bucket: process.env.ConfigBucket,
    Key: mailConfigDir + "/mail-config.json"
  };

  try {
    await isObjectOnS3(params);
  } catch (error) {
    console.error("Missing config s3://" + params.Bucket + "/" + params.Key);
    return null;
  }

  const result = await s3.getObject(params).promise();
  const mailConfig = JSON.parse(result.Body.toString("utf-8"));

  if (mailConfig === undefined) mailConfig = null;
  if (mailConfig !== null) mailConfig.dir = mailConfigDir;
  return mailConfig;
};

const getMailBody = async mailBodyFileName => {
  let params = {
    Bucket: process.env.ConfigBucket,
    Key: process.env.ConfigDir + "/default/" + mailBodyFileName
  };

  try {
    await isObjectOnS3(params);
  } catch (error) {
    console.error("Missing mail body s3://" + params.Bucket + "/" + params.Key);
    return null;
  }
  const result = await s3.getObject(params).promise();
  return result.Body.toString("utf-8");
};

const sendMail = async (mailConfig, mailBody, item, snsMsgId) => {
  let transporter = nodemailer.createTransport({
    SES: new AWS.SES({ apiVersion: "2010-12-01", region: "eu-central-1" }),
    sendingRate: 1
  });

  let mailOptions = {
    from: mailConfig.from,
    to: fillTemplate('"{{firstName}}"<{{email}}>', item),
    subject: fillTemplate(mailConfig.subject, item),
    html: fillTemplate(mailBody, item),
    ses: {
      ConfigurationSetName: process.env.SesConfigSet,
      Tags: [
        {
          Name: "mailing",
          Value: "welcome"
        }
      ]
    }
  };

  let attachments = await prepareAttachments(mailConfig);
  if (attachments !== null && attachments.length > 0)
    mailOptions.attachments = attachments;

  await transporter.sendMail(mailOptions).then(
    result =>
      console.log(
        "Subscription email sent to:" +
          item.email +
          ";SNS message id:" +
          snsMsgId
      ),
    error => {
      consoleError(item.email, snsMsgId);
      console.error(error);
    }
  );
};

const fillTemplate = (template, values) => {
  const compiledTemplate = handlebars.compile(template);
  return compiledTemplate(values);
};

const prepareAttachments = async mailConfig => {
  const attConfigs = mailConfig.attachments;
  if (
    attConfigs === undefined ||
    attConfigs === null ||
    attConfigs.length == 0
  ) {
    return null;
  }

  let attachmentsPromises = [];
  let i = attConfigs.length;
  while (--i >= 0) {
    attachmentsPromises.push(prepareAttachment(attConfigs[i], mailConfig.dir));
  }
  let attachments = await Promise.all(attachmentsPromises);
  //filter removed null values from attachments array
  return attachments.filter(Boolean);
};

const prepareAttachment = async (mailConfigAtt, mailConfigDir) => {
  var params = {
    Bucket: process.env.ConfigBucket,
    Key: mailConfigDir + "/" + mailConfigAtt.filename
  };

  try {
    await isObjectOnS3(params);
  } catch (error) {
    console.log("Missing attachment s3://" + params.Bucket + "/" + params.Key);
    return null;
  }

  return {
    filename: mailConfigAtt.filename,
    content: s3
      .getObject(params)
      .createReadStream()
      .on("error", function(error) {
        console.error(
          "Problem with attachment stream:" + mailConfigAtt.filename
        );
        console.error(error);
      }),
    cid: mailConfigAtt.filename
  };
};

const isObjectOnS3 = params => {
  return s3.headObject(params).promise();
};

const consoleError = (email, snsMsgId) => {
  console.error(
    "Subscription email NOT sent to:" + email + ";SNS message id:" + snsMsgId
  );
};
