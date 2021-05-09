#!/usr/bin/env zsh
# init
./bin/init.sh "$@" || exit 1

# build core
./bin/core/build.sh "$@" || exit 1

# build plugin
./bin/tiddlywiki-ipfs/build.sh "$@" || exit 1

# build bluelightav
./bin/editions/bluelightav/build.sh "$@" || exit 1

# build upload
./bin/cli-build-uploader.sh "$@" || exit 1

# update
# ./bin/cli-update.sh "$@" || exit 1

# done
exit 0
