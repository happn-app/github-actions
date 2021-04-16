## About

GitHub action to update Homebrew formulae on release.

This action will change the formulae by creating a commit in tap repository. It is intended to be executed, while a new tag (release) is created.
 
## Usage

1. Create secret `HOMEBREW_TAP_GITHUB_TOKEN`, which is a GitHub token having `repo` scope enabled. It ais used to create a commit and push it to the Homebrew tap repository. 
2. Configure a release workflow that is triggered on tag creation.

Sample GitHub workflow of an imaginary `hello-app` application:

```yaml
name: Homebrew

on:
  push:
    tags:
      - '*'

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
        with:
          fetch-depth: 0
      - name: Run Homebrew Release
        uses: happn-tech/actions/homebrew/homebrew-release@master
        with:
          formula_template: |
            class HelloApp < Formula
              desc "Hello app"
              homepage "https://github.com/happn-tech/hello-app"
              url "git@github.com:happn-tech/hello-app.git",
                  :using => :git,
                  :revision => "{{ revision }}",
                  :tag => "{{ tag }}"
              head "https://github.com/happn-tech/hello-app.git"
              version "{{ tag }}"

              depends_on "go" => :build

              def install
                system "go", "build", "-o", "bin/hello-app", "./main.go"
                bin.install "bin/hello-app"
              end

              test do
                system "#{bin}/hello-app", "-h"
              end
            end
          tap_owner: happn-tech
          tap_repository: homebrew-public
          tap_branch: master
          tap_formula_path: Formula/hello-app.rb
          formula_tag: ${{ env.GITHUB_REF }}
          commit_message: |
            🔖 {{ formula }}: Bump to {{ tag }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          HOMEBREW_TAP_GITHUB_TOKEN: ${{ secrets.HOMEBREW_TAP_GITHUB_TOKEN }}
```

## Customizing

Parameters 

| Name | Type | Necessity | Description |
| ---- | ---- | --------- | ----------- |
| `commit_message` | String | Mandatory | Handlebars template definition of the commit message. All available variables are listed below.  |
| `formula_tag` | String | Optional | The name of the tag. Default: `$GITHUB_REF`. | 
| `formula_template` | String | Mandatory | Template of the Homebrew formulae: Available variables for Handlebars: |
| `tap_formula_path` | String | Mandatory | Path to the formula in the tap repository. Example: `Formula/hello-app.rb` |
| `tap_owner` | String | Mandatory | Name of the organization to which tap repository belongs. |
| `tap_repository` | String | Mandatory | Name of handle of tap repository |
| `tap_branch` | String | Mandatory | Name of a branch (without the refs/... prefix), where the update formula should be committed |

### Available variables in commit message template

- `{{tag}}` / `{{version}}` - Name of the tag. Example: `1.2.0`.
- `{{formula}}` / `{{formula_file}}` - File name extracted from `tap_formula_path`. Example: `hello-app`.

### Available variables in formula template 

- `{{tag}}` / `{{version}}` - Name of the tag. Example: `1.2.0`.
- `{{formula}}` / `{{formula_file}}` - File name extracted from `tap_formula_path`. Example: `hello-app`.
- `{{revision}}` - A revision SHA hash. Example: `ffac537e6cbbf934b08745a378932722df287a53`.

## Limitations

Action has dozens of known limitations:

- This action MUST be used only in release pipelines - workflows triggered when tag has been created. 
- It is limited to update only one recipe at the same time.
- It does not check if there is already a newer version of formula pushed, which might lead to override formula with an older version.
- It cannot load a file from file system (i.e. provided in git repository).
- It relies on templating not generating the contents of Homebrew formula, which does not provide a handy interface to generate formulas with bottled/precompiled binaries. However, it could be leveraged by interpolating output from previous step or from provided environment variable.
- Currently, you cannot configure an author of the commit, it inherits the committer from token creator.


## Contributing

When you have made some changes to this action, you MUST provide a transpiled JavaScript file. For this purpose, the `package.json` includes a `build` script, which takes care of transpiling TypeScript and generating a single file as an output must be pushed within this repository. 

```shell
npm run build
```
