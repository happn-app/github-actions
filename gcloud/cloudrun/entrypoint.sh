#!/bin/bash

set -e

alias=$1
stage=$2
region=$3
is_public=$4
flags=$5
subscriptions=$6
log_level=$7
log_format=$8

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

function get {
  map=$1; key=$2
  value="$(echo $map |sed -e "s/.*--${key} \([^ ]*\).*/\1/")"
  echo $value
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
    --update-env-vars LOG_LEVEL ${log_level} \
    --update-env-vars LOG_FORMAT ${log_format} \
    --update-env-vars STAGE ${stage} \
    ${flags}

  export CLOUDRUN_URL=$(gcloud beta run services describe ${alias} --format="value(status.address.hostname)")
}

# Add IAM binding
function add_iam_binding {
  gcloud beta run services add-iam-policy-binding ${alias} \
    --quiet \
    --region ${GCLOUD_REGION} \
    --member serviceAccount:${GCLOUD_PUBSUB_INVOKER_CLOUDRUN_SA_NAME}@${GCLOUD_PROJECT_ID}.iam.gserviceaccount.com \
    --role roles/run.invoker
}

function add_subscription {
    # Get variables
    name=$(get $1 "name")
    topic=$(get $1 "topic")
    endpoint=${CLOUDRUN_URL}$(get $1 "endpoint")

    subscription=$(gcloud beta pubsub subscriptions list --filter "name = projects/${GCLOUD_PROJECT_ID}/subscriptions/${name}" 2> /dev/null)
    if [[ $subscription == *"projects/${GCLOUD_PROJECT_ID}/${name}"* ]]; then
      # Check if subscription needs update
      if [[ $subscription != *"${endpoint}"* ]]; then
        needs_update="yes"
      fi
      if [[ $subscription != *"${topic}"* ]]; then
        needs_update="yes"
      fi
      if [[ $SUBSCRIPTION != *"${GCLOUD_PUBSUB_INVOKER_CLOUDRUN_SA_NAME}"* ]]; then
        needs_update="yes"
      fi
    fi

    if [[ -z "$subscription" ]]; then
      gcloud beta pubsub subscriptions create ${name} \
        --topic ${topic} \
        --quiet \
        --expiration-period never \
        --push-endpoint ${endpoint} \
        --push-auth-service-account ${GCLOUD_PUBSUB_INVOKER_CLOUDRUN_SA_NAME}@${GCLOUD_PROJECT_ID}.iam.gserviceaccount.com
    elif [[ $needs_update == "yes" ]]; then
      gcloud beta pubsub subscriptions update ${name} \
        --topic ${topic} \
        --quiet \
        --expiration-period never \
        --push-endpoint ${endpoint} \
        --push-auth-service-account ${GCLOUD_PUBSUB_INVOKER_CLOUDRUN_SA_NAME}@${GCLOUD_PROJECT_ID}@${GCLOUD_PROJECT_ID}.iam.gserviceaccount.com
    else
      echo 'No update to subscription required'
    fi
}

setup
inject_runtime_config
build_tag_push_container
deploy

if [ -n "${subscriptions}" ]; then
  add_iam_binding
  IFS='
  '
  count=0
  for item in $subscriptions
  do
    add_subscription $item
  done
fi
