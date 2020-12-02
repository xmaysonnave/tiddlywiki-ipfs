#!/usr/bin/env zsh
echo '***'
echo '*** publish library ***'
echo '***'

./bin/cli-publish.sh \
  --dir=tiddlywiki-ipfs/library || exit 1

# done
exit 0
