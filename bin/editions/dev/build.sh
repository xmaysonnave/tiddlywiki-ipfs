#!/usr/bin/env zsh
echo '*** dev ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./bin/init-step.sh || exit 1
mkdir -p ./current/editions/dev > /dev/null 2>&1
# assets
cp ./core/modules/filters/ipfs-filters.js ./build/tiddlers/core/modules/filters > /dev/null 2>&1
cp ./core/modules/commands/clearencryptionpublickey.js ./build/tiddlers/core/modules/commands > /dev/null 2>&1
cp ./core/modules/commands/compress.js ./build/tiddlers/core/modules/commands > /dev/null 2>&1
cp ./core/modules/commands/encryptionpublickey.js ./build/tiddlers/core/modules/commands > /dev/null 2>&1
cp ./core/modules/widgets/encrypt.js ./build/tiddlers/core/modules/widgets > /dev/null 2>&1
cp ./core/modules/widgets/compress.js ./build/tiddlers/core/modules/widgets > /dev/null 2>&1
cp ./core/templates/store.area.template.html.tid ./build/tiddlers/core/templates > /dev/null 2>&1
cp -R ./editions/bluelightav/* ./build > /dev/null 2>&1
cp -R ./editions/dev/* ./build > /dev/null 2>&1
# tw5-locator
cp -R ./download/tw5-locator/plugins/locator ./build/plugins/locator > /dev/null 2>&1
# tw5-relink
cp -R ./download/tw5-relink/plugins/relink ./build/plugins/relink > /dev/null 2>&1
# set dependency
node ./bin/dependency.js "$@" || exit 1
# build raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
./bin/cli-semver.sh \
  --name=index \
  --extension=html \
  --dir=editions/dev \
  --env=DEV || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
./bin/cli-upload.sh \
  --name=index \
  --extension=html \
  --dir=editions/dev \
  --tags=$:/ipfs/editions || exit 1

# compress
# yarn gzipper compress --brotli production/editions/dev/index.html build/output/editions/dev

# done
exit 0
