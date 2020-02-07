# Serverless service - email-subscription
Need to add a subscription form for a newsletter. This project delivers a solution, which is cost-effective - serverless and reliable - as stable as AWS. There is no UI. RESTful API is designed to easily integrate with your current webpage. All you need is to POST JSON body with subscription details to the API. Of course, CORS is supported.

Designed to be flexible:
* webpage is not the only type of supported source. The API can be used in mobile application or for a system to system integration
* after a slight modifications can be a backend for a form of any kind. The minimal change is an update of a list of supported fields in CloudFormation template (see customization below)
* response on the submitted data can be any kind - event-driven architecture allows to add/remove/modify subscribers depending on your needs. Out of the box subscribers:
  * persist subscription data in DynamoDB table
  * send a welcome email
## Technology
### AWS services used
***
* API Gateway
* CloudFormation
* CloudWatch
* DynamoDB
* IAM
* Lambda
* S3
* Simple Notification Service (SNS)
* Simple Email Service (SES)
* X-Ray
### Languages
***
* YAML - CloudFormation templates
* JavaScript + Nodejs 12.x - Lambda functions 
## Project structure
***
* lambda-layer - CloudFormation template for LambdaLayer, shared JavaScript code
* api - CloudFormation template for API Gateway and Lambda validating user input
* sns - CloudFormation template for SNS Topic
* sns-dynamoDb - Cloudformation template for SNS Subscriber, DynamoDB table and Lambda reading messages from a topic and storing data in DynamoDB
* sns-ses - Cloudformation template for SNS Subscriber, S3 bucket for storing configuration and Lambda function reading messages from a topic and sending emails via Simple Email Service
* config - sample email template configuration
## Installation
### Prerequisites
***
1. Installed and configured AWS Command Line Interface (CLI) - https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html
2. Simple Email Service (SES) configured in region eu-central-1 (region can be changed in sns-ses/cloudformation.yml)
3. FROM email address in config/welcome-mail/default/mail-config.json is an email approved for usage in SES
4. Created S3 bucket for uploading CloudFormation artefacts. The bucket must be in the same region as a deployment target region.
### Deployment with install.sh script
***
Run interactive mode
``` 
$ install.sh
```
or provide all parameters in command line
``` 
$ install.sh [Application name (URL safe)] [Deployment type (URL safe)] [AWS region] [CloudFormation S3 bucket]
```
Not sure if string is URL safe check on https://www.urlencoder.io

### "Manual" deployment
***
```
aws cloudformation package \
    --region [AWS region] \
    --template-file cloudformation.yml \
    --output-template-file \
        cloudformation.packaged.yml \
    --s3-bucket [CloudFormation S3 bucket]
```
```
aws cloudformation deploy \
    --capabilities CAPABILITY_NAMED_IAM \
    --region [AWS region] \
    --template-file cloudformation.packaged.yml \
    --stack-name [Application name]-[Deployment type]-email-subscription \
    --tags Application=[Application name] DeploymentType=[Deployment type] \
    --parameter-overrides \
        AppName=[Application name] \
        DeploymentType=[Deployment type]
```
and next upload email template configuration files
```
aws s3 cp config/ s3://[Application name]-[Deployment type]-config-subscription \
    --recursive \
    --exclude "*" \
    --include "*.json" \
    --include "*.html" \
    --include "*.jpg" \
    --include "*.png" \
    --include "*.ical" \
    --include "*.pdf"
``` 
### Post-deployment check
***
Use Postman or another client to test your deployment. POST to the API url below samples, content-type application/json
* validation check - expected code 400 and response containing validation result
```
{
    "email":"wrong-email",
    "firstName":"Anonymous"
}
```
* successful payload

    _fill with your email and name_
```
{
    "email":"",
    "firstName":""
}
```
* successful payload with optional data
** fill with your data
```
{
    "email":"",
    "firstName":"",
    "lastName":"",
    "city":""
}
```
* successful payload with custom data

    _fill with your email and name, modify DataFields in api/cloudformation.yml_
```
{
    "email":"",
    "firstName":"",
    "frequency":"BiWeekly",
    "offers":"only-local"
}
```
## Customisation
### Throttling
***
Per default, API handles 2 requests per sec, which should be fine for most of the websites. It is recommended not to change this if you do not really need to. It is also good practice set up a CloudWatch alarm if your API is under heavy use for some period of time, which might be signal of an attack.
### DynamoDB
***
For production usage activation of "Point-in-time" recovery is recommended and also change of delete policy to Retain. Both settings are in `sns-dynamoDb/cloudformation.yml` resource DynamoDbTable. 
### Welcome email
***
#### Configuration
File mail-config.json contains the configuration of a email template. See in config/welcome-mail/default.
Notes:
* subject line can contain merge fields
* from and subject can contain emoji
* attachment paths should be relative to the location of the  configuration file
#### Template
Prepare an email template in a tool of your choice. In the body of the email can be used the same merge fields as submitted in RESTful payload. Additionally, subscriptionId field is available, which is required to construct unsubscribe URL. Handlebars notation is used to include merge field and it is case sensitive.
Images in a body can be:
* remote - valid URL in src
* local - sent as part of the message - in such case replace all src with "cid:[local path]", where the local path is the same as defined in mail-config.json.
#### Attachments
Upload all attachments in a subfolder of a folder containing an email configuration JSON. Remember to update mail-config.json. Only files listed in the attachment section will be attached to an email.
### Extenstions
***
#### Additional data
For security reasons, the list of data fields is defined in the configuration. It is property DataFields in `api/cloudformation.yml`
#### Data validation
All data validation is done in lambda function invoked from API Gateway. Go to `api/functions/handler.js` and implement additional validations depending on your needs.
#### Data handling - subscriber
Check on the web how to add a new SNS subscriber. Start from AWS documentation 
https://docs.aws.amazon.com/sns/latest/dg/sns-tutorial-create-subscribe-endpoint-to-topic.html

All subscriber stacks are registered in the main `cloudformation.yml`. 

Of course, if you want to remove subscriber simply comment or delete appropriate stack in main `cloudformation.yml`.
## Feedback
***
Fill free to share your feedback.
1. Report issues or feature requests in GitHub issue tracker. Please try to include as much information as you can.
2. Contribute via pull requests

Click Star if you use email-subscription as it is or after modification. It is always nice to know that the solution is used.
## License
***
This code is made available under the MIT License. See the LICENSE file.