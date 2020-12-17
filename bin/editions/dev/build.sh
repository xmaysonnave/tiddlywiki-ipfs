#!/usr/bin/env zsh
echo '***'
echo '*** build dev ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# init
./bin/init-editions.sh "$@" || exit 1
rm -f -R ./build/output/editions/dev > /dev/null 2>&1
mkdir -p ./build/output/editions/dev > /dev/null 2>&1
rm -f -R ./production/editions/dev > /dev/null 2>&1
mkdir -p ./production/editions/dev > /dev/null 2>&1
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1
rm -f -R ./build/plugins > /dev/null 2>&1
mkdir -p ./current/editions/dev > /dev/null 2>&1

# assets
cp -R ./editions/bluelightav-raw/* ./build || exit 1
cp -R ./editions/dev-raw/* ./build || exit 1

# tw5-locator
rm -f -R ./build/plugins/locator > /dev/null 2>&1
mkdir -p ./build/plugins/locator > /dev/null 2>&1
cp -R ./download/tw5-locator/plugins/locator ./build/plugins || exit 1

# tw5-relink
rm -f -R ./build/plugins/relink > /dev/null 2>&1
mkdir -p ./build/plugins/relink > /dev/null 2>&1
cp -R ./download/tw5-relink/plugins/relink ./build/plugins || exit 1

# set dependency
node ./bin/dependency.js "$@" || exit 1

# build raw
echo '***'
echo '*** raw dev ***'
echo '***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# init
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

# assets
cp ./editions/dev/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# set dependency
node ./bin/dependency.js "$@" || exit 1

# check hash and set version
./bin/cli-semver.sh \
  --name=index \
  --extension=html \
  --dir=editions/dev \
  --env=DEV "$@" || exit 1

echo '***'
echo '*** dev ***'
echo '***'
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-upload.sh \
  --name=index.html \
  --extension=html \
  --dir=editions/dev \
  --tags=$:/ipfs/editions "$@" || exit 1

# compress
# yarn gzipper compress --brotli production/editions/dev/index.html build/output/editions/dev

# done
exit 0
