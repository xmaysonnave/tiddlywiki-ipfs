#!/usr/bin/env zsh
echo '***'
echo '*** build ***'
echo '***'

# init
./bin/init.sh "$@" || exit 1

# build
./bin/download.sh "$@" || exit 1

# build core
./bin/core/build.sh "$@" || exit 1

# build plugin
./bin/tiddlywiki-ipfs/build.sh "$@" || exit 1

# build editions
./bin/editions/build.sh "$@" || exit 1

# build upload
./bin/cli-build-uploader.sh "$@" || exit 1

# update
# ./bin/cli-update.sh "$@" || exit 1

# done
exit 0
