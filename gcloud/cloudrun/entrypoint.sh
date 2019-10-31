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

# Configures Google Cloud SDK
function setup {
  echo $GCLOUD_SERVICE_KEY | gcloud auth activate-service-account --key-file=-
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
  docker build --build-arg GITHUB_ACCESS_TOKEN=${GITHUB_TOKEN} --rm=false -t
    ${GCLOUD_CONTAINER_REGISTRY}/${GCLOUD_PROJECT_ID}/${alias}:${{ github.sha }} .

  docker tag ${GCLOUD_CONTAINER_REGISTRY}/${GCLOUD_PROJECT_ID}/${alias}:${{ github.sha }}
    ${GCLOUD_CONTAINER_REGISTRY}/${GCLOUD_PROJECT_ID}/${alias}:latest

  docker push ${GCLOUD_CONTAINER_REGISTRY}/${GCLOUD_PROJECT_ID}/${alias}
}

# Deploys function to Cloudrun
function deploy {
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
