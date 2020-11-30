#!/usr/bin/env zsh
echo '***'
echo '*** tiddlywiki.com ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./bin/init-editions.sh "$@" || exit 1
rm -f -R ./build/output/editions/tiddlywiki.com > /dev/null 2>&1
mkdir -p ./build/output/editions/tiddlywiki.com > /dev/null 2>&1
rm -f -R ./production/editions/tiddlywiki.com > /dev/null 2>&1
mkdir -p ./production/editions/tiddlywiki.com > /dev/null 2>&1
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1
rm -f -R ./build/plugins > /dev/null 2>&1
mkdir -p ./current/editions/tiddlywiki.com > /dev/null 2>&1

# assets
cp -R ./editions/tiddlywiki.com/* ./build || exit 1

# set dependency
node ./bin/dependency.js "$@" || exit 1

# build raw
echo '*** build raw tiddlywiki.com ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# set dependency
node ./bin/dependency.js "$@" || exit 1

# check hash and set version
echo '*** build tiddlywiki.com semver ***'
./bin/cli-semver.sh \
  --name=index \
  --extension=html \
  --dir=editions/tiddlywiki.com \
  --env=TIDDLYWIKI || exit 1

# build
echo '*** build tiddlywiki.com ***'
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
echo '*** upload tiddlywiki.com ***'
./bin/cli-upload.sh \
  --name=index.html \
  --extension=html \
  --dir=editions/tiddlywiki.com \
  --tags=$:/ipfs/editions || exit 1

# compress
# yarn gzipper compress --brotli production/editions/tiddlywiki.com/index.html build/output/editions/tiddlywiki.com

# done
exit 0
