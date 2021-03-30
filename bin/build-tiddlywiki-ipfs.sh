#!/usr/bin/env zsh
echo '***'
echo '*** build tiddlywiki-ipfs ***'
echo '***'

# init
./bin/init.sh "$@" || exit 1

# build plugin
./bin/tiddlywiki-ipfs/build.sh "$@" || exit 1

# build ipload
./bin/cli-upload-build.sh "$@" || exit 1

# update
./bin/cli-update.sh "$@" || exit 1

# done
exit 0
