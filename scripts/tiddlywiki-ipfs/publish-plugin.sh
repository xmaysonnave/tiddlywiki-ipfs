#!/usr/bin/env zsh
echo '*** publish-plugin ***'
# publish library
node ./scripts/tiddlywiki-ipfs/library/publish-library.js "$@" || exit 1
# done
exit 0
