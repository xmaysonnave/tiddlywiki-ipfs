#!/usr/bin/env zsh
echo '*** build-plugin ***'
# build library
./scripts/tiddlywiki-ipfs/library/build-library.sh "$@" || exit 1
# done
exit 0
