#!/usr/bin/env zsh
echo '*** publish library ***'

./bin/cli-publish.sh \
  --dir=tiddlywiki-ipfs/library || exit 1

# done
exit 0
