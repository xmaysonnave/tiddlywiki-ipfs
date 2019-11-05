#!/bin/bash
npx tiddlywiki build \
  --import tw5-cardo/Cardo-1.0.4.json application/json \
  --output wiki \
  --build \
  --verbose || exit 1
