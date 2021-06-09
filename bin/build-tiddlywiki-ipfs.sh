#!/usr/bin/env zsh
echo '***'
echo '*** build tiddlywiki-ipfs ***'
echo '***'

# init
./bin/init.sh "$@" || exit 1

# build tiddlywki
./bin/tiddlywki/build.sh "$@" || exit 1

# build plugin
./bin/tiddlywiki-ipfs/build.sh "$@" || exit 1

# upload
./bin/cli-build-uploader.sh "$@" || exit 1

# load
./bin/cli-build-loader.sh "$@" || exit 1

# update
# ./bin/cli-updater.sh "$@" || exit 1

# done
exit 0
