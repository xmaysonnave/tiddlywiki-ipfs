#!/usr/bin/env zsh
echo '***'
echo '*** publish documentation ***'
echo '***'

./bin/cli-publish.sh \
  --dir=tiddlywiki-ipfs/documentation || exit 1

# done
exit 0
