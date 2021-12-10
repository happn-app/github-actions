#!/usr/bin/env bash

set -e

format_github_output() {
    OUTPUT_CHANGELOG=$1
    OUTPUT_CHANGELOG="${OUTPUT_CHANGELOG//'%'/'%25'}"
    OUTPUT_CHANGELOG="${OUTPUT_CHANGELOG//$'\n'/'%0A'}"
    OUTPUT_CHANGELOG="${OUTPUT_CHANGELOG//$'\r'/'%0D'}"
    echo "$OUTPUT_CHANGELOG"
}

format_for_markdown() {
  MESSAGE=$CHANGELOG
  FORMATTED_JIRA=$(echo "$MESSAGE" | sed -E 's|([A-Z]+-[0-9]+)|[\1](https://happnapp.atlassian.net/browse/\1)|g')
  
  echo "$FORMATTED_JIRA"
}
format_for_slack() {
  MESSAGE=$CHANGELOG
  FORMATTED_JIRA=$(echo "$MESSAGE" | sed -E 's!([A-Z]+-[0-9]+)!<https://happnapp.atlassian.net/browse/\1|\1>!g')
  FORMATTED_PR=$(echo "$FORMATTED_JIRA" | sed -E "s!#([0-9]+)!<$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/pull/\1|#\1>!g")
  
  echo "$FORMATTED_PR"
}


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
NB_COMMITS=$(echo "$CHANGELOG" | wc -l)

echo "Found $NB_COMMITS commits"
echo "$CHANGELOG"

SLACK_OUTPUT=$(format_for_slack "$CHANGELOG")
MD_OUTPUT=$(format_for_markdown "$CHANGELOG")

OUTPUT_CHANGELOG=$(format_github_output "$CHANGELOG")
OUTPUT_CHANGELOG_SLACK=$(format_github_output "$SLACK_OUTPUT")
OUTPUT_CHANGELOG_MD=$(format_github_output "$MD_OUTPUT")

echo "::set-output name=changelog::$OUTPUT_CHANGELOG"
echo "::set-output name=changelog_slack::$OUTPUT_CHANGELOG_SLACK"
echo "::set-output name=changelog_md::$OUTPUT_CHANGELOG_MD"
