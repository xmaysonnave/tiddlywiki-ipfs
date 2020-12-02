#!/usr/bin/env zsh
echo '***'
echo '*** publish plugin ***'
echo '***'

./bin/cli-publish.sh \
  --dir=tiddlywiki-ipfs/plugin || exit 1

# done
exit 0
