#!/usr/bin/env zsh
echo '***'
echo '*** build empty ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./bin/init-editions.sh "$@" || exit 1
rm -f -R ./build/output/editions/ > /dev/null 2>&1
mkdir -p ./build/output/editions/empty > /dev/null 2>&1
rm -f -R ./production/editions/empty > /dev/null 2>&1
mkdir -p ./production/editions/empty > /dev/null 2>&1
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1
rm -f -R ./build/plugins > /dev/null 2>&1
mkdir -p ./current/editions/empty > /dev/null 2>&1

rm -f -R ./build/plugins/locator > /dev/null 2>&1
rm -f -R ./build/plugins/relink > /dev/null 2>&1

# assets
cp -R ./editions/empty-raw/* ./build || exit 1

# set dependency
node ./bin/dependency.js "$@" || exit 1

# build raw
echo '*** raw empty ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# init
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

# assets
cp ./editions/empty/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# set dependency
node ./bin/dependency.js "$@" || exit 1

# check hash and set version
echo '*** semver empty ***'
./bin/cli-semver.sh \
  --name=index \
  --extension=html \
  --dir=editions/empty \
  --env=EMPTY || exit 1

echo '*** empty ***'
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
