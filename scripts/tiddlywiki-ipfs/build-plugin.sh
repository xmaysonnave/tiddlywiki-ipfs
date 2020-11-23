#!/usr/bin/env zsh
echo '*** build-plugin ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# build library
./scripts/tiddlywiki-ipfs/library/build.sh "$@" || exit 1
# publish
node ./scripts/tiddlywiki-ipfs/library/publish.js "$@" || exit 1

# build boot
./scripts/tiddlywiki-ipfs/boot/build.sh "$@" || exit 1
node ./scripts/tiddlywiki-ipfs/boot/publish.js "$@" || exit 1

# build plugin
./scripts/tiddlywiki-ipfs/plugin/build.sh "$@" || exit 1
node ./scripts/tiddlywiki-ipfs/plugin/publish.js "$@" || exit 1

# build documentation
./scripts/tiddlywiki-ipfs/documentation/build.sh "$@" || exit 1
node ./scripts/tiddlywiki-ipfs/documentation/publish.js "$@" || exit 1

# done
exit 0
