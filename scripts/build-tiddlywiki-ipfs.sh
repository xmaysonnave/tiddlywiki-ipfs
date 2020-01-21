#!/bin/bash
npx tiddlywiki build \
  --output wiki \
  --build \
  --verbose \
|| exit 1

exit 0
