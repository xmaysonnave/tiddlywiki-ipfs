#!/usr/bin/env zsh
# init
./bin/init.sh "$@" || exit 1

# build plugin
./bin/tiddlywiki-ipfs/build.sh "$@" || exit 1

# build bluelightav
./bin/editions/bluelightav/build.sh "$@" || exit 1

# build node
./bin/cli-upload-node.sh \
  --dir=editions "$@" || exit 1

# build node
./bin/cli-upload-node.sh \
  --dir=. "$@" || exit 1

# publish build
./bin/cli-publish-build.sh "$@" || exit 1

# done
exit 0
