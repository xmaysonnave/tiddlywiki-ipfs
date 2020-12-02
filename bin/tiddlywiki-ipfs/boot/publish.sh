#!/usr/bin/env zsh
echo '*** publish boot ***'

./bin/cli-publish.sh \
  --dir=tiddlywiki-ipfs/boot || exit 1

# done
exit 0
