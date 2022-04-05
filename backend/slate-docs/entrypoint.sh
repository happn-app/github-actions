#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

main() {
   cp -R $DOC_BASE_FOLDER/* /srv/slate/source
   CUR_DIR=$(pwd)
   cd /srv/slate
   /srv/slate/slate.sh build
   mv /srv/slate/build $CUR_DIR/build
}

main "$@"

