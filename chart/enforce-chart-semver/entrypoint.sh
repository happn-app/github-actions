#!/usr/bin/env bash

set -e

echo "Resolving repository path..."
repo_root=$(git rev-parse --show-toplevel)
pushd "$repo_root" > /dev/null

SERVER_URL=$(echo "$GITHUB_SERVER_URL" | awk -F/ '{print $3}')

echo "Setting up 'temp_changed_files' remote..."
git ls-remote --exit-code temp_changed_files 1>/dev/null 2>&1 && exit_status=$? || exit_status=$?

if [[ $exit_status -ne 0 ]]; then
  echo "No 'temp_changed_files' remote found"
  echo "Creating 'temp_changed_files' remote..."
  git remote add temp_changed_files "https://${GITHUB_TOKEN}@${SERVER_URL}/${GITHUB_REPOSITORY}"
else
  echo "Found 'temp_changed_files' remote"
fi

echo "Getting HEAD info..."
CURRENT_SHA=$(git rev-parse HEAD 2>&1) && exit_status=$? || exit_status=$?

if [[ $exit_status -ne 0 ]]; then
  echo "::warning::Unable to determine the current head sha"
  git remote remove temp_changed_files
  exit 1
fi

TARGET_BRANCH=$GITHUB_BASE_REF
CURRENT_BRANCH=$GITHUB_HEAD_REF
git fetch temp_changed_files --no-tags -u "${TARGET_BRANCH}":"${TARGET_BRANCH}"
PREVIOUS_SHA=$(git rev-parse "${TARGET_BRANCH}" 2>&1) && exit_status=$? || exit_status=$?

if [[ $exit_status -ne 0 ]]; then
  echo "::warning::Unable to determine the base ref sha for ${TARGET_BRANCH}"
  git remote remove temp_changed_files
  exit 1
fi

chart_not_updated=()

CHANGED_FILES=$(git diff --diff-filter="AM" --name-only "$PREVIOUS_SHA" "$CURRENT_SHA")
CHANGED_DIRS=$(echo $CHANGED_FILES | rev | cut -d'/' -f2- | rev)
for CHANGED_DIR in $(echo $CHANGED_FILES | rev | cut -d'/' -f2- | rev)
do
  echo "Checking directory $CHANGED_DIR"
  if [[ -f "${CHANGED_DIR}/Chart.yaml" ]]; then
    CHART_VERSION_CHANGED=$(git diff -U0 "$PREVIOUS_SHA" "$CURRENT_SHA" "${CHANGED_DIR}/Chart.yaml" | grep -c '+version:')
    if [[ "$CHART_VERSION_CHANGED" -gt 0 ]]; then
      echo "Chart in $CHANGED_DIR was updated"
    else
      chart_not_updated+=("$CHANGED_DIR")
    fi
  fi
done
git remote remove temp_changed_files

if [[ -n "${chart_not_updated[*]}" ]]; then
  echo "::warning:: Some Chart version were not updated : ${chart_not_updated[*]}"
  exit 1
else
  echo "Everything is good !"
fi
