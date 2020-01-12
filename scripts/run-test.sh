#!/bin/bash

./scripts/build-all.sh || exit 1

jest --verbose ./test