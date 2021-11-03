#!/usr/bin/env bash

# inspired by https://github.com/helm/chart-releaser-action/blob/main/cr.sh
set -o errexit
set -o nounset
set -o pipefail

main() {
    local config=
    local charts_dir=.
    local charts_repo_url=

    parse_command_line "$@"

    local repo_root
    repo_root=$(git rev-parse --show-toplevel)
    pushd "$repo_root" > /dev/null

    echo 'Looking up latest tag...'
    local latest_tag
    latest_tag=$(lookup_latest_tag)

    echo "Discovering changed charts since '$latest_tag'..."
    local changed_charts=()
    echo "Found charts $(lookup_changed_charts "$latest_tag")"
    while IFS= read -r line; do changed_charts+=("$line"); done <<< "$(lookup_changed_charts "$latest_tag")"

    if [[ -n "${changed_charts[*]}" ]]; then

        rm -rf .helm-release-packages
        mkdir -p .helm-release-packages

        for chart in "${changed_charts[@]}"; do
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
    while :; do
        case "${1:-}" in
            -u|--charts-repo-url)
                if [[ -n "${2:-}" ]]; then
                    charts_repo_url="$2"
                    shift
                fi
                ;;
            *)
                break
                ;;
        esac

        shift
    done

    if [[ -z "$charts_repo_url" ]]; then
        charts_repo_url="http://charts.happn.io"
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

lookup_changed_charts() {
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
    echo "$chartFile" | cut -d'.' -f1
}

release_charts() {
    echo 'Releasing charts...'
    for chart in `ls .helm-release-packages`
    do
      echo "releasing chart $chart"
      curl --data-binary "@.helm-release-packages/$chart" $charts_repo_url
      releaseName=$(extract_release_name $chart)
      echo "Creating GithubRelease $releaseName"
      hub release -m "$releaseName" $releaseName
    done
}

main "$@"

