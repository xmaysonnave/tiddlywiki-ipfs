#!/usr/bin/env zsh
echo '***'
echo '*** build tiddlywiki-ipfs ***'
echo '***'

# build library
./bin/tiddlywiki-ipfs/library/build.sh "$@" || exit 1

# build sjcl
./bin/tiddlywiki-ipfs/sjcl/build.sh "$@" || exit 1

# build boot
./bin/tiddlywiki-ipfs/boot/build.sh "$@" || exit 1

# build plugin
./bin/tiddlywiki-ipfs/plugin/build.sh "$@" || exit 1

# build documentation
./bin/tiddlywiki-ipfs/documentation/build.sh "$@" || exit 1

# done
exit 0
