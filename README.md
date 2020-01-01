Get email details from a dynamodb table and send with ses, in a serverless way with aws (batch, dynamodb, lambda and ses). Templating system is based on handlebars.

### Install
- `npm i --production`
- create an `aws-keys.json` with your credentials, see: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html
- send on aws:
```
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="..."
export AWS_REGION="..."
export TF_VAR_aws_region=your_region
export TF_VAR_docker_image=your_ecr_image_path
terraform apply
```

### How it works
- store your template in `templates/`
- store this payload on dynamodb:
```
{
    id: ...
    to: [...],
    locals: {
       ...
    },
    from: ....,
    subject: ...,
    template: ...
}
```

### Development and local testing
- install https://github.com/localstack/localstack/
- install aws cli
- start localstack:
```
export SERVICES=dynamodb,ses
docker-compose up
```
- create a dynamodb table:
```
aws dynamodb create-table --endpoint=http://localhost:4569 --table-name postino_mails --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```
- insert a record in dynamodb:
```
aws dynamodb put-item --endpoint=http://localhost:4569 --table-name postino_mails --item file://item.json
```
example of item.json:
```
{
  "id": {
    "S": "test"
  },
  "to": {
    "L": [
      {
        "S": "test@example.com"
      }
    ]
  },
  "locals": {
    "M": {
      "test": {
        "S": "ok"
      }
    }
  },
  "from": {
    "S": "admin@example.com"
  },
  "subject": {
    "S": "Test"
  },
  "template": {
    "S": "testtemplate"
  }
}
```
- create a template in template, example for `testtemplate.html`:
```
This is to see if it's {{ test }}
```
- verify email on ses: 
```
aws ses verify-email-identity --email-address admin@example.com --endpoint-url=http://localhost:4579
```

#### Build on localhost
- go in the project root
- build the image: `docker build -t postino .`
- run the image: 
```
docker run --network="host" -e DYNAMO_OPTIONS='{"endpoint":"http://localhost:4569"}' -e SES_OPTIONS='{"endpoint":"http://localhost:4579"}' -e AWS_REGION='localhost' -t postino
```
