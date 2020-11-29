#!/usr/bin/env zsh
echo '*** bluelightav ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./bin/init-editions.sh "$@" || exit 1
rm -f -R ./build/output/editions/bluelightav
mkdir -p ./build/output/editions/bluelightav
rm -f -R ./production/editions/bluelightav
mkdir -p ./production/editions/bluelightav
rm -f -R ./build/tiddlers
mkdir -p ./build/tiddlers
rm -f -R ./build/plugins
mkdir -p ./current/editions/bluelightav

# tw5-locator
rm -f -R ./build/plugins/locator
mkdir -p ./build/plugins/locator
cp -R ./download/tw5-locator/plugins/locator ./build/plugins

# tw5-relink
rm -f -R ./build/plugins/relink
mkdir -p ./build/plugins/relink
cp -R ./download/tw5-relink/plugins/relink ./build/plugins

# assets
cp -R ./editions/bluelightav-raw/* ./build

# set dependency
node ./bin/dependency.js "$@" || exit 1

# build raw
echo '*** build raw bluelightav ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# build
echo '*** build bluelightav ***'

# init
rm -f -R ./build/tiddlers
mkdir -p ./build/tiddlers

# assets
cp ./editions/bluelightav/tiddlywiki.info ./build/tiddlywiki.info

# set dependency
node ./bin/dependency.js "$@" || exit 1

# check hash and set version
echo '*** build bluelightav semver ***'
./bin/cli-semver.sh \
  --name=index \
  --extension=html \
  --dir=editions/bluelightav \
  --env=BLUELIGHTAV || exit 1

yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
echo '*** upload bluelightav ***'
./bin/cli-upload.sh \
  --name=index.html \
  --extension=html \
  --dir=editions/bluelightav \
  --tags=$:/ipfs/editions || exit 1

# compress
# yarn gzipper compress --brotli production/editions/bluelightav/index.html build/output/editions/bluelightav

# done
exit 0
