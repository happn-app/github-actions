#!/bin/bash

set -e

REPO="$(cut -d'/' -f2 <<<"$GITHUB_REPOSITORY")"
ALIAS="$1"
DEPLOYMENT="$REPO-$2-$3"

mv now.json now-${DEPLOYMENT}.json
jq --arg alias "$ALIAS" --arg name "$DEPLOYMENT" '.name = $name | .alias = $alias' now-$DEPLOYMENT.json > now.json
now -t $ZEIT_TOKEN
now -t $ZEIT_TOKEN --prod
