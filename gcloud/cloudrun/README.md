# Cloudrun action

This action allows you to deploy your code to `Cloudrun`. It will automatically setup the `gcloud` SDK, build, push and deploy the container.

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
    - uses: drivetopurchase/actions/gcloud/cloudrun@v1.9.2
      with:
        alias: hello-world
        use_runtime_config: false
```

## Inputs

| Name               | Type             | Description                                                                   |  Default  | Required |
| ------------------ | ---------------- | ----------------------------------------------------------------------------- | --------  | -------- |
| alias              | string           | ID of the service or fully qualified identifier for the service               |           | Yes      |
| async              | bool             | Return immediately, without waiting for the operation in progress to complete | false     | No       |
| is_public          | bool             | Whether to allow unauthenticated access to the service                        | true      | No       |
| vars               | string           | Environment variables that will be injected into the container                |           | No       |
| log_level          | string           | Sets the LOG_LEVEL environment variable in the container                      | info      | No       |
| log_format         | string           | Sets the LOG_FORMAT environment variable in the container                     | json      | No       |
| add_iam_binding    | bool             | Whether to add IAM binding for Cloud Pub/Sub                                  | false     | No       |
| max_instances      | int              | Maximum number of container instances of the service                          | default   | No       |
| memory             | string           | Sets a memory limit for each instance Ex: 1Gi, 512Mi                          | 256Mi     | No       |
| concurrency        | int              | Sets the number of concurrent requests allowed per container instance         | default   | No       |
| timeout            | string           | Sets the maximum request execution time (timeout)                             | 5m        | No       |
| use_runtime_config | bool             | Whether to inject runtime config variables as environment variables           | true      | No       |

## Outputs

| Name               | Type             | Description    |
| ------------------ | ---------------- | ----------------
| url                | string           | Cloudrun URL   |

## Passing environment variables from runtime configurator

We believe that passing environment variables in each repository is a tedious task, we also believe that keeping the code `DRY` is very important.

We manage runtime variables with `Terraform` like the below:

```hcl
resource "google_runtimeconfig_variable" "facebook_app_id" {
  parent = google_runtimeconfig_config.context.name
  name   = "facebook/app-id"
  text   = var.facebook_app_id
}
```

When `use_runtime_config` is marked as true (default) the variable `facebook/app-id` will be converted to `FACEBOOK_APP_ID`. If you want to inject it afterwards into your container, you'll simply reference it from the `vars` section.

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v1
    - uses: drivetopurchase/actions/gcloud/cloudrun@v1.9.2
      with:
        alias: hello-world
        vars: |-
          FACEBOOK_APP_ID=${FACEBOOK_APP_ID}
```

## Required environment variables
 
| Name                                   | Type             | Description                                  | Example        |
| ---------------------------------------| ---------------- | -------------------------------------------- | -------------- |
| GCLOUD_CONTAINER_REGISTRY              | string           | Where to push/pull docker images             | eu.gcr.io      |
| GCLOUD_PROJECT_ID                      | string           | Google Cloud Project ID                      |                |
| GCLOUD_REGION                          | string           | Google Cloud Region                          | us-central1    |
| GCLOUD_SERVICE_KEY                     | string           | Service Key in JSON format                   |                |
| GCLOUD_PUBSUB_INVOKER_CLOUDRUN_SA_NAME | string           | Name of the service account used for pub/sub | foobar         |
| STAGE                                  | string           | Stage (Required only for runtime config)     | staging        |
| REGION                                 | string           | Region (Required only for runtime config)    | us             |
