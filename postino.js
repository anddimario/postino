'use strict';
const AWS = require('aws-sdk');
const handlebars = require('handlebars');
const fs = require('fs');
const { promisify } = require('util');

//http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html
AWS.config.loadFromPath('aws-keys.json');
AWS.config.update({
  region: process.env_AWS_REGION
});


const dynamodb = new AWS.DynamoDB.DocumentClient(JSON.parse(process.env.DYNAMO_OPTIONS));
const ses = new AWS.SES(JSON.parse(process.env.SES_OPTIONS));

const readFile = promisify(fs.readFile);

async function getTemplateHtml(file, params) {
  try {
    const template = await readFile(`./templates/${file}.html`, 'utf8');
    const compiled = handlebars.compile(template);
    const emailHtml = compiled(params);
    return emailHtml;
  } catch (e) {
    throw e;
  }
}

// send email https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SES.html#sendEmail-property
async function sendEmail(ToAddresses, Source, subject, emailHtml) {
  try {
    const params = {
      Destination: {
        ToAddresses
      },
      Source,
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: emailHtml
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject
        }
      }
    };
    await ses.sendEmail(params).promise();
    return;
  } catch (e) {
    throw e;
  }
}

function fetchPaged(params, key) {
  if (key) {
    params.ExclusiveStartKey = key;
  }
  return dynamodb.scan(params).promise();
}

async function getAllMail(params, key) {
  try {
    let scanAgain = true;
    let allMails = [];
    while (scanAgain) {
      if (key) {
        params.ExclusiveStartKey = key;
      }
      const response = await dynamodb.scan(params).promise();
      allMails = allMails.concat(response.Items);
      scanAgain = response.LastEvaluatedKey;
      key = scanAgain;
    }
    return allMails;
  } catch (e) {
    throw e;
  }
}

async function main() {
  try {
    // get from dynamodb
    const mails = await getAllMail({
      TableName: 'postino_mails',
    });
    for (const mail of mails) {
      // create template
      const emailHtml = await getTemplateHtml(mail.template, mail.locals);
      // send email
      const sendResult = await sendEmail(mail.to, mail.from, mail.subject, emailHtml);
      // remove from dynamodb, if sendEmail throw an error, this is not called
      await dynamodb.delete({
        TableName: 'postino_mails',
        Key: {
          id: mail.id
        }
      }).promise();
    }
    return;
  } catch (err) {
    console.log(err);
    process.exit(1);
  }

}

main()