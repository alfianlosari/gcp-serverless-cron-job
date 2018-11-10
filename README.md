# Serverless Scheduled Daily Report Notification Service using Google Cloud Platform

## Installation
1. Clone
2. Replace constant for bucket name, slack webhook url, secret key with your own value
3. Deploy to Google Cloud

## Tutorial


## GCP Services Used
1. Google Cloud Storage: create bucket to save the generated CSV blob for public URL access.
2. BigQuery: query for Global Historical Climate Network public datasets. Generate data for previous week maximum temperature within location radius around GHCN station in Jakarta sorted by distance in kilometers and max temperature.
3. Google Cloud Functions: a node.js function to query data from BigQuery, transform it into CSV and save it into cloud, then notify Slack Channel via Webhook sending the URL.
4. Google Cloud Scheduler: a scheduled job that will trigger Cloud Function endpoint daily at every midnight UTC.