#!/bin/bash

set -e

REPO="$(cut -d'/' -f2 <<<"$GITHUB_REPOSITORY")"
ALIAS="$3.$1"
DEPLOYMENT="$REPO-$2-$3"

echo $ALIAS
echo $DEPLOYMENT

mv now.json now-${DEPLOYMENT}.json
jq --arg alias "$ALIAS" --arg name "$DEPLOYMENT" '.name = $name | .alias = $alias' now-$DEPLOYMENT.json > now.json
now -t $ZEIT_TOKEN
now -t $ZEIT_TOKEN --prod
