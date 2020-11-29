#!/usr/bin/env zsh
echo '*** dev ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./bin/init-editions.sh "$@" || exit 1
rm -f -R ./build/output/editions/dev
mkdir -p ./build/output/editions/dev
rm -f -R ./production/editions/dev
mkdir -p ./production/editions/dev
rm -f -R ./build/tiddlers
mkdir -p ./build/tiddlers
rm -f -R ./build/plugins
mkdir -p ./current/editions/dev

# assets
cp -R ./editions/bluelightav-raw/* ./build
cp -R ./editions/dev-raw/* ./build

# tw5-locator
rm -f -R ./build/plugins/locator
mkdir -p ./build/plugins/locator
cp -R ./download/tw5-locator/plugins/locator ./build/plugins

# tw5-relink
rm -f -R ./build/plugins/relink
mkdir -p ./build/plugins/relink
cp -R ./download/tw5-relink/plugins/relink ./build/plugins

# set dependency
node ./bin/dependency.js "$@" || exit 1

# build raw
echo '*** build raw dev ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# build
echo '*** build dev ***'

# init
rm -f -R ./build/tiddlers
mkdir -p ./build/tiddlers

# assets
cp ./editions/dev/tiddlywiki.info ./build/tiddlywiki.info

# set dependency
node ./bin/dependency.js "$@" || exit 1

# check hash and set version
echo '*** build dev semver ***'
./bin/cli-semver.sh \
  --name=index \
  --extension=html \
  --dir=editions/dev \
  --env=DEV || exit 1

yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
echo '*** upload dev***'
./bin/cli-upload.sh \
  --name=index.html \
  --extension=html \
  --dir=editions/dev \
  --tags=$:/ipfs/editions || exit 1

# compress
# yarn gzipper compress --brotli production/editions/dev/index.html build/output/editions/dev

# done
exit 0
