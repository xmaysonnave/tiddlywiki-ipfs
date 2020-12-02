#!/usr/bin/env zsh
echo '*** publish tiddlywiki-ipfs ***'

# publish library
./bin/tiddlywiki-ipfs/library/publish.sh "$@" || exit 1

# publish boot
./bin/tiddlywiki-ipfs/boot/publish.sh "$@" || exit 1

# publish plugin
./bin/tiddlywiki-ipfs/plugin/publish.sh "$@" || exit 1

# publish documentation
./bin/tiddlywiki-ipfs/documentation/publish.sh "$@" || exit 1

# done
exit 0
