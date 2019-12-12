#!/bin/bash

set -e

name=$1
topic=$2
expiration_period=$3
push_endpoint=$4

# Configures Google Cloud SDK
function setup {
  echo $GCLOUD_SERVICE_KEY | gcloud auth activate-service-account --key-file=-
  gcloud components install beta --quiet
  gcloud components update --quiet
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

# Adds a subscription to pub/sub service
function add_subscription {
    subscription=$(gcloud beta pubsub subscriptions list --filter "name = projects/${GCLOUD_PROJECT_ID}/subscriptions/${name}" 2> /dev/null)
    if [[ $subscription == *"projects/${GCLOUD_PROJECT_ID}/${name}"* ]]; then
      # Check if subscription needs update
      if [[ $subscription != *"${push_endpoint}"* ]]; then
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
        --push-endpoint ${push_endpoint} \
        --push-auth-service-account ${GCLOUD_PUBSUB_INVOKER_CLOUDRUN_SA_NAME}@${GCLOUD_PROJECT_ID}.iam.gserviceaccount.com
    elif [[ $needs_update == "yes" ]]; then
      gcloud beta pubsub subscriptions update ${name} \
        --topic ${topic} \
        --quiet \
        --expiration-period never \
        --push-endpoint ${push_endpoint} \
        --push-auth-service-account ${GCLOUD_PUBSUB_INVOKER_CLOUDRUN_SA_NAME}@${GCLOUD_PROJECT_ID}@${GCLOUD_PROJECT_ID}.iam.gserviceaccount.com
    else
      echo 'No update to subscription required'
    fi
}

setup
inject_runtime_config
add_subscription