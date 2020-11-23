#!/usr/bin/env zsh
echo '*** build-noclone ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./scripts/build-init.sh || exit 1
# build plugin
./scripts/tiddlywiki-ipfs/build-plugin.sh || exit 1
# publish plugin
./scripts/tiddlywiki-ipfs/publish-plugin.sh || exit 1
# ./scripts/run-prepare.sh || exit 1
# ./scripts/run-browserify.sh || exit 1
# ./scripts/build-assets.sh || exit 1
# build tiddlywiki editions
# ./scripts/build-editions.sh || exit 1

# format and lint
yarn prettier-standard || exit 1

# done
exit 0
