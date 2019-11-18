#!/bin/bash

set -e

alias=$1
stage=$2
region=$3
is_public=$4
flags=$5

case $is_public in
  (true)    allow_unauthenticated=--allow-unauthenticated;;
  (false)   allow_unauthenticated=;;
esac

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
  gcloud components install beta --quiet
  gcloud components update --quiet
  gcloud config set project ${GCLOUD_PROJECT_ID}
  gcloud config set compute/region ${GCLOUD_REGION}
  gcloud config set run/platform managed
  gcloud auth configure-docker -q
}

# Export runtime config variables into current bash session
function inject_runtime_config {
  export $(
    gcloud beta runtime-config configs variables list \
      --values \
      --config-name ${stage}-${region} \
      --format='json' \
      | jq -r '.[] | [(.name | split("/") | join("_") | split("-") | join("_") | ascii_upcase), .value] | join("=")' \
      | xargs
  )
}

# Builds, tags and pushes container to registry
function build_tag_push_container {
  docker build --build-arg GITHUB_ACCESS_TOKEN=${GITHUB_TOKEN} --rm=false -t \
    ${GCLOUD_CONTAINER_REGISTRY}/${GCLOUD_PROJECT_ID}/${alias}:${GITHUB_SHA} .

  docker tag ${GCLOUD_CONTAINER_REGISTRY}/${GCLOUD_PROJECT_ID}/${alias}:${GITHUB_SHA} \
    ${GCLOUD_CONTAINER_REGISTRY}/${GCLOUD_PROJECT_ID}/${alias}:latest

  docker push ${GCLOUD_CONTAINER_REGISTRY}/${GCLOUD_PROJECT_ID}/${alias}
}

# Deploys function to Cloudrun
function deploy {
  # List environment variables
  flags=$(expand_vars <<< $flags)
  gcloud beta run deploy ${alias} \
    --quiet \
    ${allow_unauthenticated} \
    --project ${GCLOUD_PROJECT_ID} \
    --image ${GCLOUD_CONTAINER_REGISTRY}/${GCLOUD_PROJECT_ID}/${alias} \
    --region ${GCLOUD_REGION} \
    ${flags}
}

setup
inject_runtime_config
build_tag_push_container
deploy
