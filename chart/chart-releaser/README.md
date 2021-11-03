## About

GitHub action to release chart to happn chart repository (chartmuseum)

This action will list changed charts, package each of them and create a github release for each of them.

## Usage

### Sample workflow definition

Below is an example of usage:

```yaml
name: Release

on:
  push:
    branches:
      - master

env:
  SLACK_CHANNEL_NAME: "testing"

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Release charts
        id: release-charts
        uses: happn-tech/github-actions/chart/chart-releaser@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          chart-repository-url: http://charts.happn.io
```

## Customizing

### Parameters

| Name | Type | Necessity | Description |
| ---- | ---- | --------- | ----------- |
| `chart-repository-url` | String | Optional | url of chart repository |

## Limitations

Action release charts only if Chart.yaml was modified, so you should handle versioning by yourself
