#!/usr/bin/env bash

./scripts/run-prepare.sh || exit 1

./scripts/run-browserify.sh || exit 1

./scripts/build-tiddlywiki-empty.sh || exit 1

exit 0
