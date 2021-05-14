#!/usr/bin/env zsh
echo '***'
echo '*** build tiddlywiki ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# node
export NODE_PATH=.

rm -f -R ./build/output/editions/tiddlywiki > /dev/null 2>&1
mkdir -p ./build/output/editions/tiddlywiki > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers/config > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

mkdir -p ./current/editions/tiddlywiki > /dev/null 2>&1

# assets
cp -R ./editions/tiddlywiki-raw/* ./build || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build raw
echo '***'
echo '*** raw tiddlywiki ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose || exit 1

# assets
cp -R ./editions/tiddlywiki/* ./build || exit 1

# check hash and set version
./bin/cli-semver.sh \
  --name=tiddlywiki \
  --extension=html \
  --dir=editions/tiddlywiki \
  --env=TIDDLYWIKI "$@"
if [ $? -gt 1 ];
then
  echo "*** Unchanged 'tiddlywiki' ***"
  exit 0
fi

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build
echo '***'
echo '*** tiddlywiki ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=tiddlywiki \
  --extension=html \
  --faviconFileName=favicon.ico \
  --dir=editions/tiddlywiki \
  --tags=$:/ipfs/editions "$@" || exit 1

# compress
# yarn gzipper compress --brotli production/editions/tiddlywiki/index.html build/output/editions/tiddlywiki

# done
exit 0
