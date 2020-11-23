#!/usr/bin/env zsh
echo '*** publish-plugin ***'
# publish library
node ./scripts/tiddlywiki-ipfs/library/publish.js "$@" || exit 1
# publish boot
node ./scripts/tiddlywiki-ipfs/boot/publish.js "$@" || exit 1
# done
exit 0
