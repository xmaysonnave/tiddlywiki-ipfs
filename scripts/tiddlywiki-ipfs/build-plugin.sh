#!/usr/bin/env zsh
echo '*** build-plugin ***'
# build library
./scripts/tiddlywiki-ipfs/library/build.sh "$@" || exit 1
# build boot
./scripts/tiddlywiki-ipfs/boot/build.sh "$@" || exit 1
# done
exit 0
