#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

main() {
   cp -R $DOC_BASE_FOLDER/* /srv/slate/source
   cd /srv/slate
   /srv/slate/slate.sh build
   mv /srv/slate/build $DOC_BASE_FOLDER/build
}

main "$@"

