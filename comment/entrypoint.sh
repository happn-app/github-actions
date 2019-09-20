#!/bin/bash

set -e

if [[ -z "$GITHUB_TOKEN" ]]; then
	echo "The GITHUB_TOKEN is required."
	exit 1
fi

message=$1

echo "Making a comment"
payload=$(echo '{}' | jq --arg body "$message" '.body = $body')
comments_url=$(cat /github/workflow/event.json | jq -r .pull_request.comments_url)
echo $payload
echo $comments_url
curl -s -S -H "Authorization: token $GITHUB_TOKEN" --header "Content-Type: application/json" --data "$payload" "$comments_url" > /dev/null
