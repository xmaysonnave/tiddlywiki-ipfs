#!/usr/bin/env zsh
echo '***'
echo '*** build ***'
echo '***'

# init
./bin/init.sh "$@" || exit 1

# build
./bin/download.sh "$@" || exit 1

# build plugin
./bin/tiddlywiki-ipfs/build.sh "$@" || exit 1

# build editions
./bin/editions/build.sh "$@" || exit 1

# build node
./bin/cli-upload-node.sh \
  --dir=. "$@" || exit 1

# set root node
./bin/cli-root-node.sh "$@" || exit 1

# done
exit 0
