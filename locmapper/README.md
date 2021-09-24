# LocMapper action

## Basic usage

```yaml
name: LocMapper
on:
  push:
    branches:
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: happn-tech/actions/locmapper@master
        with:
          command: 'lint'
```

## Inputs

| Name               | Type             | Description                                                                   |  Default  | Required |
| ------------------ | ---------------- | ----------------------------------------------------------------------------- | --------  | -------- |
| command            | string           | Default command                                                               |           | -        |
