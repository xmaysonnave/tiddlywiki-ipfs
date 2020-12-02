#!/usr/bin/env zsh
DIR='./build/output/tiddlywiki-ipfs/boot'
if [[ ! -d "$DIR" ]]; then
  ./bin/tiddlywiki-ipfs/boot/build.sh "$@" || exit 1
fi

DIR='./build/output/tiddlywiki-ipfs/library'
if [[ ! -d "$DIR" ]]; then
  ./bin/tiddlywiki-ipfs/library/build.sh "$@" || exit 1
fi

DIR='./build/output/tiddlywiki-ipfs/documentation'
if [[ ! -d "$DIR" ]]; then
  ./bin/tiddlywiki-ipfs/documentation/build.sh "$@" || exit 1
fi

DIR='./build/output/tiddlywiki-ipfs/plugin'
if [[ ! -d "$DIR" ]]; then
  ./bin/tiddlywiki-ipfs/plugin/build.sh "$@" || exit 1
fi

# done
exit 0
