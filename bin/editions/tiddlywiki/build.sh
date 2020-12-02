#!/usr/bin/env zsh
echo '***'
echo '*** build tiddlywiki ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./bin/init-editions.sh "$@" || exit 1
rm -f -R ./build/output/editions/tiddlywiki > /dev/null 2>&1
mkdir -p ./build/output/editions/tiddlywiki > /dev/null 2>&1
rm -f -R ./production/editions/tiddlywiki > /dev/null 2>&1
mkdir -p ./production/editions/tiddlywiki > /dev/null 2>&1
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1
rm -f -R ./build/plugins > /dev/null 2>&1
mkdir -p ./current/editions/tiddlywiki > /dev/null 2>&1

# assets
cp -R ./editions/tiddlywiki/* ./build || exit 1

# set dependency
node ./bin/dependency.js "$@" || exit 1

# build raw
echo '*** raw tiddlywiki ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# set dependency
node ./bin/dependency.js "$@" || exit 1

# check hash and set version
echo '*** semver tiddlywiki ***'
./bin/cli-semver.sh \
  --name=index \
  --extension=html \
  --dir=editions/tiddlywiki \
  --env=TIDDLYWIKI || exit 1

# build
echo '*** tiddlywiki ***'
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
echo '*** upload tiddlywiki ***'
./bin/cli-upload.sh \
  --name=index.html \
  --extension=html \
  --dir=editions/tiddlywiki \
  --tags=$:/ipfs/editions || exit 1

# compress
# yarn gzipper compress --brotli production/editions/tiddlywiki/index.html build/output/editions/tiddlywiki

# done
exit 0
