#!/bin/bash
npx tiddlywiki ipfs \
  --import tw5-cardo/Cardo-1.0.4.json application/json \
  --output ipfs/output/cardo \
  --build \
  --verbose || exit 1
