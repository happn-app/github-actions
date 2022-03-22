## About

GitHub action to extract a changelog from every commits between 2 tags

## Usage
### Sample workflow definition

Below is an example of usage:

```yaml
name: Branch validation

on:
  push:
    tags:
      - '[0-9]+.[0-9]+*'

jobs:
  change-log-builder:
    name: Release logs
    runs-on: [ self-hosted ]

    steps:
      - name: Checkout
        uses: actions/checkout@v2
        with:
          fetch-depth: 0
          token: ${{ secrets.PERSONNAL_AUTH_TOKEN_HAPPN_CI }}

      - name: Build Changelog
        id: github_changelog
        uses: happn-app/github-actions/backend/release-notes@release-notes
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Log my change log
        run: |
          echo "My changelog ${{steps.github_changelog.outputs.changelog}}"
```
