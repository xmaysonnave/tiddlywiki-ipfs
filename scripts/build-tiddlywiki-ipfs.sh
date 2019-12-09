#!/bin/bash
npx tiddlywiki build \
  --output wiki \
  --build \
  --verbose || exit 1

node ./node_modules/tiddlywiki/tiddlywiki.js build \
	--verbose \
	--output wiki \
	--rendertiddler $:/core/save/all dev.html text/plain \
	|| exit 1

  exit 0
