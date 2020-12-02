#!/usr/bin/env zsh
echo '*** publish plugin ***'

./bin/cli-publish.sh \
  --dir=tiddlywiki-ipfs/plugin || exit 1

# done
exit 0
