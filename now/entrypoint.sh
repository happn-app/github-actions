#!/bin/bash

set -e

REPO="$(cut -d'/' -f2 <<<"$GITHUB_REPOSITORY")"
ALIAS="$1"
DEPLOYMENT="$REPO-$2-$3"

cp .env.${2}-${3} .env.production
mv now.json now-${DEPLOYMENT}.json
jq --arg alias "$ALIAS" --arg name "$DEPLOYMENT" '.name = $name | .alias = $alias' now-$DEPLOYMENT.json > now.json

case $4 in
  (true)    url=$(now -t $ZEIT_TOKEN --prod);;
  (false)   url=$(now -t $ZEIT_TOKEN);;
esac

echo ::set-output name=url::$url
