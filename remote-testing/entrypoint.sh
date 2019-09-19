#!/bin/bash

set -e

export CI=true
export REACT_APP_TEST=true
export URL_TEST=$1

npm ci
npm test
