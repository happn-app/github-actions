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
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Release charts
        id: release-charts
        uses: happn-app/github-actions/chart/chart-releaser@master
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
| `chart` | String | Optional | chart to release manually |

## Limitations

Action release charts only if Chart.yaml was modified, so you should handle versioning by yourself
