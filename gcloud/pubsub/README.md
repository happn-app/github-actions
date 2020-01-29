# Google Cloud Pub/Sub action

This action manages the `creation` and `update` of `Google Cloud Pub/Sub` subscriptions. It will automatically setup the `gcloud` SDK.

It is a bit opinionated on some aspects like injection of runtime configuration variables and predefined environment variables names. Everything is documented below.

## Basic usage

Create a `workflow.yaml` file in `.github/workflows` with the following contents:

```yaml
name: Deploy > api
on:
  push:
    branches:
    - master

env:
  GCLOUD_PROJECT_ID: your-gcloud-project-id
  GCLOUD_REGION: europe-west1
  GCLOUD_SERVICE_KEY: ${{ secrets.GCLOUD_SERVICE_KEY }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - uses: drivetopurchase/actions/gcloud/pubsub@v1.9.0
      with:
        name: name-of-subscription
        topic: name-of-topic
        push_endpoint: ${{ steps.cloudrun.outputs.url }}/
```

## Inputs

| Name               | Type             | Description                                                                   |  Default  | Required |
| ------------------ | ---------------- | ----------------------------------------------------------------------------- | --------  | -------- |
| name               | string           | Name of subscription                                                          |           | Yes      |
| topic              | string           | ID of the topic or fully qualified identifier for the topic                   |           | Yes      |
| expiration_period  | string           | The subscription will expire if it is inactive for the given period           | never     | No       |
| ack_deadline       | string           | The number of seconds the system will wait for a subscriber to acknowledge    | 10        | No       |
| push_endpoint      | string           | Push endpoint                                                                 |           | Yes      |
| use_runtime_config | bool             | Whether to inject runtime config variables as environment variables           | true      | No       |

## Passing environment variables from runtime configurator

We believe that passing environment variables in each repository is a tedious task, and we also believe that keeping the code `DRY` is very important.

We manage runtime variables with `Terraform` like the below:

```hcl
resource "google_runtimeconfig_variable" "my_topic_from_runtime_cfg" {
  parent = google_runtimeconfig_config.context.name
  name   = "my/topic-from-runtime"
  text   = "foobar"
}
```

When `use_runtime_config` is marked as true (default) the variable `my/topic-from-runtime` will be converted to `MY_TOPIC_FROM_RUNTIME` and variable will be lazily evaluated once the runtime configuration is fully retrieved. Example below.

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - uses: drivetopurchase/actions/gcloud/pubsub@v1.9.0
      with:
        name: name-of-subscription
        topic: ${MY_TOPIC_FROM_RUNTIME}
        push_endpoint: ${{ steps.cloudrun.outputs.url }}/
```

## Required environment variables
 
| Name                                   | Type             | Description                                  | Example        |
| ---------------------------------------| ---------------- | -------------------------------------------- | -------------- |
| GCLOUD_PROJECT_ID                      | string           | Google Cloud Project ID                      |                |
| GCLOUD_REGION                          | string           | Google Cloud Region                          | us-central1    |
| GCLOUD_SERVICE_KEY                     | string           | Service Key in JSON format                   |                |
| GCLOUD_PUBSUB_INVOKER_CLOUDRUN_SA_NAME | string           | Name of the service account used for pub/sub | foobar         |
| STAGE                                  | string           | Stage (Required only for runtime config)     | staging        |
| REGION                                 | string           | Region (Required only for runtime config)    | us             |
