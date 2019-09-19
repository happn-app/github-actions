#!/bin/bash

set -e
export STAGE=$1
export REGION_ISO2=$2

cp .env.$STAGE-$REGION_ISO2 .env.production
npm install
npm run build
ws --https --http2 --spa index.html --compress -d build & sleep 2
npm run test
