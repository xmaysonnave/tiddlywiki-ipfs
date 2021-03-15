#!/usr/bin/env zsh
echo '***'
echo '*** build tiddlywiki-ipfs ***'
echo '***'

# init
./bin/init.sh "$@" || exit 1

# build plugin
./bin/tiddlywiki-ipfs/build.sh "$@" || exit 1

# build node
./bin/cli-upload-node.sh \
  --dir=. "$@" || exit 1

# done
exit 0
