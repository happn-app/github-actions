#!/usr/bin/env bash

set -e

echo "Resolving tags"
git fetch --tags > /dev/null 2>&1

CURRENT_TAG=${GITHUB_REF##*/}
if [ -z "$CURRENT_TAG" ]; then
  CURRENT_TAG=$(git rev-parse HEAD)
fi 

PREVIOUS_TAG=$(git tag --sort=-creatordate -l "[0-9]*.[0-9]*" | head -n 2 | tail -n 1)
if [ "$CURRENT_TAG" = "$PREVIOUS_TAG" ]; then
  echo "This is first release tag, using first commit"
  PREVIOUS_TAG=$(git rev-list --max-parents=0 HEAD)
fi

echo "Getting commits between ${PREVIOUS_TAG} and ${CURRENT_TAG}"
CHANGELOG=$(git log --pretty=format:%s ${PREVIOUS_TAG}..${CURRENT_TAG})
NB_COMMITS=$(echo -n "$CHANGELOG" | wc -l)

echo "Found $NB_COMMITS commits"
echo "$CHANGELOG"

OUTPUT_CHANGELOG=$CHANGELOG
OUTPUT_CHANGELOG="${OUTPUT_CHANGELOG//'%'/'%25'}"
OUTPUT_CHANGELOG="${OUTPUT_CHANGELOG//$'\n'/'%0A'}"
OUTPUT_CHANGELOG="${OUTPUT_CHANGELOG//$'\r'/'%0D'}"
echo "::set-output name=changelog::$OUTPUT_CHANGELOG"
