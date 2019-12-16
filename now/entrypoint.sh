#!/bin/bash

set -e

alias=$1
name=$2
env=$3
prod=$4
force=$5
vars=$6

function expand_vars {
  local line lineEscaped
  while IFS= read -r line || [[ -n $line ]]; do  # the `||` clause ensures that the last line is read even if it doesn't end with \n
    # Escape ALL chars. that could trigger an expansion..
    IFS= read -r -d '' lineEscaped < <(printf %s "$line" | tr '`([$' '\1\2\3\4')
    # ... then selectively reenable ${ references
    lineEscaped=${lineEscaped//$'\4'{/\${}
    # Finally, escape embedded double quotes to preserve them.
    lineEscaped=${lineEscaped//\"/\\\"}
    eval "printf '%s\n' \"$lineEscaped\"" | tr '\1\2\3\4' '`([$'
  done
}

# Configures Google Cloud SDK
function setup {
  echo $GCLOUD_SERVICE_KEY | gcloud auth activate-service-account --key-file=-
  gcloud config set project ${GCLOUD_PROJECT_ID}
  gcloud config set compute/region ${GCLOUD_REGION}
}

# Export runtime config variables into current bash session
function inject_runtime_config {
  export $(
    gcloud beta runtime-config configs variables list \
      --values \
      --config-name ${STAGE}-${REGION} \
      --format='json' \
      | jq -r '.[] | [(.name | split("/") | join("_") | split("-") | join("_") | ascii_upcase), .value] | join("=")' \
      | xargs
  )
}

function deploy {
  expand_vars <<< $vars > .env.production

  mv now.json now-${name}.json
  jq --arg alias "$alias" --arg name "$name" '.name = $name | .alias = $alias' now-$name.json > now.json

  case $force in
    (true)    force='--force';;
    (false)   force='';;
  esac

  case $prod in
    (true)    url=$(now -t $ZEIT_TOKEN --prod $force);;
    (false)   url=$(now -t $ZEIT_TOKEN $force);;
  esac

  echo ::set-output name=url::$url
}

setup
inject_runtime_config
deploy