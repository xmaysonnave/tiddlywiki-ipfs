#!/bin/bash
npx tiddlywiki ipfs \
  --output ipfs/output/base \
  --build \
  --verbose || exit 1
