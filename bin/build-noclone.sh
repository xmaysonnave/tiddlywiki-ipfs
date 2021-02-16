#!/usr/bin/env zsh
echo '***'
echo '*** build noclone ***'
echo '***'

# init
./bin/init-build-tiddlywiki-ipfs.sh "$@" || exit 1

# build plugin
./bin/tiddlywiki-ipfs/build.sh "$@" || exit 1

# build editions
./bin/editions/build.sh "$@" || exit 1

# build node
./bin/cli-upload-node.sh \
  --dir=. "$@" || exit 1

# build root node
./bin/cli-root-node.sh "$@" || exit 1

# done
exit 0
