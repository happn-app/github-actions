## About

GitHub action to check if chart version was correctly updated when chart is modified in a PR

## Usage

### Sample workflow definition

Below is an example of usage:

```yaml
name: Branch validation

on:
  pull_request:
    branches:
      - master

jobs:
  enforce-chart-semver:
    name: Release Charts
    runs-on: [ self-hosted ]

    steps:
      - name: Checkout
        uses: actions/checkout@v2
        with:
          fetch-depth: 0
          token: ${{ secrets.PERSONNAL_AUTH_TOKEN_HAPPN_CI }}

      - name: Validate chart version was changed
        id: chart-version-updated
        uses: happn-app/github-actions/chart/enforce-chart-semver@chart-semver
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
