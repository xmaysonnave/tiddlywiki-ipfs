#!/usr/bin/env zsh
echo '*** empty ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./bin/init-editions.sh "$@" || exit 1
rm -f -R ./build/output/editions/empty
mkdir -p ./build/output/editions/empty
rm -f -R ./production/editions/empty
mkdir -p ./production/editions/empty
rm -f -R ./build/tiddlers
mkdir -p ./build/tiddlers
rm -f -R ./build/plugins
mkdir -p ./current/editions/empty

rm -f -R ./build/plugins/locator
rm -f -R ./build/plugins/relink

# assets
cp -R ./editions/empty-raw/* ./build

# set dependency
node ./bin/dependency.js "$@" || exit 1

# build raw
echo '*** build raw empty ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# build
echo '*** build empty***'

# init
rm -f -R ./build/tiddlers
mkdir -p ./build/tiddlers

# assets
cp ./editions/empty/tiddlywiki.info ./build/tiddlywiki.info

# set dependency
node ./bin/dependency.js "$@" || exit 1

# check hash and set version
echo '*** build empty semver ***'
./bin/cli-semver.sh \
  --name=index \
  --extension=html \
  --dir=editions/empty \
  --env=EMPTY || exit 1

yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
echo '*** upload empty ***'
./bin/cli-upload.sh \
  --name=index.html \
  --extension=html \
  --dir=editions/empty \
  --tags=$:/ipfs/editions || exit 1

# compress
# yarn gzipper compress --brotli production/editions/empty/index.html build/output/editions/empty

# done
exit 0
