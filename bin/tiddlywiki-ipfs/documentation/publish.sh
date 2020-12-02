#!/usr/bin/env zsh
echo '*** publish documentation ***'

./bin/cli-publish.sh \
  --dir=tiddlywiki-ipfs/documentation || exit 1

# done
exit 0
