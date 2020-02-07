#!/bin/bash

#Get deployment parameters - command line
appNameVar=$1
deploymentTypeVar=$2
awsRegionVar=$3
awsCfBucketVar=$4


#Get deployment parameters - interactive
while [[ $appNameVar == '' ]]
do
    read -p "Application name (URL safe) eg. my-app: " appNameVar
done
while [[ $deploymentTypeVar == '' ]]
do
    read -p "Deployment type (URL safe) eg. dev: " deploymentTypeVar
done
while [[ $awsRegionVar == '' ]]
do
    read -p "Target AWS region eg. eu-central-1: " awsRegionVar
done
while [[ $awsCfBucketVar == '' ]]
do
    read -p "S3 bucket name for uploading CloudFormation artefacts, must be in the region $awsRegionVar: " awsCfBucketVar
done

echo "=== Service deployment START ==="
aws cloudformation package \
    --region $awsRegionVar \
    --template-file cloudformation.yml \
    --output-template-file cloudformation.packaged.yml \
    --s3-bucket $awsCfBucketVar
aws cloudformation deploy \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $awsRegionVar \
    --template-file cloudformation.packaged.yml \
    --stack-name $appNameVar-$deploymentTypeVar-email-subscription \
    --tags Application=$appNameVar DeploymentType=$deploymentTypeVar \
    --parameter-overrides \
        AppName=$appNameVar \
        DeploymentType=$deploymentTypeVar
echo "=== Service deployment END ==="

echo "=== Upload to S3 service configuration files START ==="
aws s3 cp config/ s3://$appNameVar-$deploymentTypeVar-config-subscription \
    --recursive \
    --exclude "*" \
    --include "*.json" \
    --include "*.html" \
    --include "*.jpg" \
    --include "*.png" \
    --include "*.ical" \
    --include "*.pdf"
echo "=== Upload to S3 service configuration files END ==="

echo "=== All done ==="
echo "Your service is available under URL:"
aws cloudformation list-exports \
    --region eu-north-1 \
    | grep -B1 "$appNameVar-$deploymentTypeVar-ApiGatewayUrl-subscription" \
    | grep Value
echo "Data is stored in DynamoDB table:"
aws cloudformation list-exports \
    --region eu-north-1 \
    | grep -B1 "$appNameVar-$deploymentTypeVar-DynamoDb-subscription" \
    | grep Value
echo "Email configuration and template are in S3 bucket:"
aws cloudformation list-exports \
    --region eu-north-1 \
    | grep -B1 "$appNameVar-$deploymentTypeVar-S3Bucket-config-subscription" \
    | grep Value
