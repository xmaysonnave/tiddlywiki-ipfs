#!/usr/bin/env zsh
echo '*** dev ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./scripts/init-step.sh || exit 1
mkdir -p ./current/editions/bluelightav > /dev/null 2>&1
# assets
cp ./src/plugins/ipfs/ipfs-filters.js ./build/tiddlers/core/modules/filters > /dev/null 2>&1
cp ./src/plugins/ipfs/core/modules/commands/clearencryptionpublickey.js ./build/tiddlers/core/modules/commands > /dev/null 2>&1
cp ./src/plugins/ipfs/core/modules/commands/compress.js ./build/tiddlers/core/modules/commands > /dev/null 2>&1
cp ./src/plugins/ipfs/core/modules/commands/encryptionpublickey.js ./build/tiddlers/core/modules/commands > /dev/null 2>&1
cp ./src/plugins/ipfs/core/modules/widgets/encrypt.js ./build/tiddlers/core/modules/widgets > /dev/null 2>&1
cp ./src/plugins/ipfs/core/modules/widgets/compress.js ./build/tiddlers/core/modules/widgets > /dev/null 2>&1
cp ./tiddlers/plugins/ipfs/core/templates/store.area.template.html.tid ./build/tiddlers/core/templates > /dev/null 2>&1
cp -R ./editions/bluelightav/* ./build > /dev/null 2>&1
# tw5-locator
cp -R ./tw5-locator/plugins/locator ./build/plugins/locator > /dev/null 2>&1
# tw5-relink
cp -R ./tw5-relink/plugins/relink ./build/plugins/relink > /dev/null 2>&1
# set dependency
node ./scripts/dependency.js "$@" || exit 1
# build raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
node ./scripts/editions/bluelightav/semver.js "$@" || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# done
exit 0
