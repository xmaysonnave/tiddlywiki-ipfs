#!/usr/bin/env zsh
echo '***'
echo '*** publish boot ***'
echo '***'

./bin/cli-publish.sh \
  --dir=tiddlywiki-ipfs/boot || exit 1

# done
exit 0
