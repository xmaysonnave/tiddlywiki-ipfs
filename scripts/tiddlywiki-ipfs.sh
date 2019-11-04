#!/bin/bash
npx tiddlywiki ipfs \
  --output build/base \
  --build \
  --verbose || exit 1
