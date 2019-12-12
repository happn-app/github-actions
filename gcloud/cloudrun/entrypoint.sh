#!/bin/bash

set -e

alias=$1
is_public=$2
flags=$3
log_level=$4
log_format=$5
add_iam_binding=$6

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
      --config-name ${STAGE}-${REGION} \
      --format='json' \
      | jq -r '.[] | [(.name | split("/") | join("_") | split("-") | join("_") | ascii_upcase), .value] | join("=")' \
      | xargs
  )
}

# Builds, tags and pushes container to registry
function build_tag_push_container {
  docker build --build-arg GITHUB_ACCESS_TOKEN=${GITHUB_ACCESS_TOKEN} --rm=false -t \
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
    --update-env-vars LOG_LEVEL=${log_level} \
    --update-env-vars LOG_FORMAT=${log_format} \
    --update-env-vars STAGE=${STAGE} \
    ${flags}

  url=$(gcloud beta run services describe ${alias} --region ${GCLOUD_REGION} --format="value(status.address.hostname)")
  echo ::set-output name=url::$url
}

# Add IAM binding
function add_iam_binding {
  gcloud beta run services add-iam-policy-binding ${alias} \
    --quiet \
    --region ${GCLOUD_REGION} \
    --member serviceAccount:${GCLOUD_PUBSUB_INVOKER_CLOUDRUN_SA_NAME}@${GCLOUD_PROJECT_ID}.iam.gserviceaccount.com \
    --role roles/run.invoker
}

setup
inject_runtime_config
build_tag_push_container
deploy

case $add_iam_binding in
  (true) add_iam_binding;;
esac
