#!/usr/bin/env bash

# inspired by https://github.com/helm/chart-releaser-action/blob/main/cr.sh
set -o errexit
set -o nounset
set -o pipefail

main() {
    local charts_dir=.
    local chart_manual=
    local charts_repo_url=${CHART_REPO_URL:-http://charts.happn.io/api/charts}
    local repo_root
    repo_root=$(git rev-parse --show-toplevel)
    pushd "$repo_root" > /dev/null

    parse_command_line "$@"

    
    local changed_charts=()
    find_changed_charts;
   
    if [[ -n "${changed_charts[*]}" ]]; then

        rm -rf .helm-release-packages
        mkdir -p .helm-release-packages

        for chart in "${changed_charts[@]}"; do
            echo $(pwd)
            if [[ -d "$chart" ]]; then
                package_chart "$chart"
            else
                echo "Chart '$chart' no longer exists in repo. Skipping it..."
            fi
        done

        release_charts
    else
        echo "Nothing to do. No chart changes detected."
    fi

    popd > /dev/null
}

parse_command_line() {
    if [[ ! -z "${1:-}" ]]; then
      if [[ ! -d "$1"  || ! -f "$1/Chart.yaml" ]]; then
        echo "ERROR: $1 is not a chart directory" 1>&2
        exit 1
      fi
        chart_manual=$1
    fi
}

find_changed_charts() {
   if [[ ! -z "${chart_manual}" ]]
    then
      changed_charts+=("${chart_manual}")
    else
      echo 'Looking up latest tag...'
          local latest_tag
          latest_tag=$(lookup_latest_tag)
          echo "Discovering changed charts since '$latest_tag'..."
          changed_charts_from_git=$(lookup_changed_charts_from_git "$latest_tag")
          
          echo "Found charts: $(echo $changed_charts_from_git | tr -d '\n')"
          while IFS= read -r line; do changed_charts+=("$line"); done <<< "$changed_charts_from_git"
    fi
}

lookup_latest_tag() {
    git fetch --tags > /dev/null 2>&1

    if ! git describe --tags --abbrev=0 2> /dev/null; then
        git rev-list --max-parents=0 --first-parent HEAD
    fi
}

filter_charts() {
    while read -r chart; do
        [[ ! -d "$chart" ]] && continue
        local file="$chart/Chart.yaml"
        if [[ -f "$file" ]]; then
            echo "$chart"
        else
           echo "WARNING: $file is missing, assuming that '$chart' is not a Helm chart. Skipping." 1>&2
        fi
    done
}

lookup_changed_charts_from_git() {
    local commit="$1"

    local changed_files
    changed_files=$(git diff --find-renames --name-only "$commit" -- "$charts_dir")

    local depth=$(( $(tr "/" "\n" <<< "$charts_dir" | sed '/^\(\.\)*$/d' | wc -l) + 1 ))
    local fields="1-${depth}"

    cut -d '/' -f "$fields" <<< "$changed_files" | uniq | filter_charts
}

package_chart() {
    local chart="$1"

    echo "Packaging chart '$chart'..."
    helm package --destination .helm-release-packages "$chart"
}

extract_release_name() {
    local chartFile="$1"
    echo "${chartFile%.*}"
}

release_charts() {
    echo 'Releasing charts...'
    cd .helm-release-packages
    for chart in `ls`
    do
      echo "releasing chart $chart"
      curl --data-binary "@$chart" $charts_repo_url
      releaseName=$(extract_release_name $chart)
      echo "Creating GithubRelease $releaseName"
      hub release create -m "$releaseName" $releaseName
    done
}

main "$@"

