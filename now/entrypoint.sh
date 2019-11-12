#!/bin/bash

set -e

alias=$1
name=$2
env=$3
prod=$4

if [ -n "${env}" ]; then cp $env .env.production; fi

mv now.json now-${name}.json
jq --arg alias "$alias" --arg name "$name" '.name = $name | .alias = $alias' now-$name.json > now.json

case $prod in
  (true)    url=$(now -t $ZEIT_TOKEN --prod);;
  (false)   url=$(now -t $ZEIT_TOKEN);;
esac

echo ::set-output name=url::$url
