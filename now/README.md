# Zeit/Now action

This action allows you to deploy your code to `Zeit/Now`. It will automatically setup the `gcloud` and the `now` SDK.

It is a bit opinionated on some aspects like injection of runtime configuration variables and predefined environment variables names. Everything is documented below.

## Basic usage

Create a `workflow.yaml` file in `.github/workflows` with the following contents:

```yaml
name: Deploy > frontend
on:
  push:
    branches:
      - master

env:
  GCLOUD_PROJECT_ID: your-gcloud-project-id
  GCLOUD_REGION: us-central1
  GCLOUD_SERVICE_KEY: ${{ secrets.GCLOUD_SERVICE_KEY }}
  ZEIT_TOKEN: ${{ secrets.ZEIT_TOKEN }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: drivetopurchase/actions/now@v1.9.0
        with:
          alias: my-zeit-alias
          name: my-app-name
          prod: true
```

## Inputs

| Name               | Type             | Description                                                                   |  Default  | Required |
| ------------------ | ---------------- | ----------------------------------------------------------------------------- | --------  | -------- |
| alias              | string           | Domain name                                                                   |           | Yes      |
| name               | string           | String name for the deployment                                                |           | Yes      |
| prod               | bool             | Is it a production deployment?                                                | false     | No       |
| force              | bool             | Forces a new build even if artefact did not change                            | false     | No       |
| vars               | string           | Environment variables that will be injected during build                      |           | No       |
| use_runtime_config | bool             | Whether to inject runtime config variables as environment variables           | true      | No       |

## Outputs

| Name               | Type             | Description      |
| ------------------ | ---------------- | ---------------- |
| url                | string           | Deployment URL   |

## Passing environment variables from runtime configurator

We believe that passing environment variables in each repository was a tedious task, and we believe that keeping the code `DRY` is very important.

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
      - uses: drivetopurchase/actions/now@v1.9.0
        with:
          alias: my-zeit-alias
          name: my-app-name
          prod: true
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
| STAGE                                  | string           | Stage (Required only for runtime config)     | staging        |
| REGION                                 | string           | Region (Required only for runtime config)    | us             |
