#!/usr/bin/env zsh
echo '***'
echo '*** build empty ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# cleanup
find ./sample -name "empty*.*" -delete > /dev/null 2>&1

rm -f -R ./build/output/editions/empty > /dev/null 2>&1
mkdir -p ./build/output/editions/empty > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

rm -f -R ./production/editions/empty > /dev/null 2>&1
mkdir -p ./production/editions/empty > /dev/null 2>&1

mkdir -p ./current/editions/empty > /dev/null 2>&1

# assets
cp -R ./editions/empty-raw/* ./build || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build raw
echo '***'
echo '*** raw empty ***'
echo '***'
yarn cli-tiddlywiki-ipfs build \
  --build \
  --verbose "$@" || exit 1

# init
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

# assets
cp ./editions/empty/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# check hash and set version
./bin/cli-semver.sh \
  --name=index.html \
  --extension=html \
  --dir=editions/empty \
  --env=EMPTY "$@" || exit 1

echo '***'
echo '*** empty ***'
echo '***'
yarn cli-tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-upload.sh \
  --name=index.html \
  --extension=html \
  --dir=editions/empty \
  --tags=$:/ipfs/editions "$@" || exit 1

# compress
# yarn gzipper compress --brotli production/editions/empty/index.html build/output/editions/empty

# done
exit 0
