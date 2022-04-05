#!/usr/bin/env bash
set -o errexit
set -o nounset
set -o pipefail

main() {
   cp -R $DOC_BASE_FOLDER/* /srv/slate/source
   mkdir -p build
   CUR_DIR=$(pwd)
   cd /srv/slate
   /srv/slate/slate.sh build
   cp -R /srv/slate/build/* $CUR_DIR/build/
   chmod 777 -R $CUR_DIR/build/
}

main "$@"

