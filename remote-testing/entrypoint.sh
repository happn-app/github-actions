#!/bin/bash

set -e

export CI=true
export REACT_APP_TEST=true

npm ci
npm test
