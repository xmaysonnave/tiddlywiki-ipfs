#!/usr/bin/env zsh
echo '***'
echo '*** build bluelightav ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# cleanup
find ./sample -name "index*.*" -delete > /dev/null 2>&1

rm -f -R ./build/output/editions/bluelightav > /dev/null 2>&1
mkdir -p ./build/output/editions/bluelightav > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers/config > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

rm -f -R ./production/editions/bluelightav > /dev/null 2>&1
mkdir -p ./production/editions/bluelightav > /dev/null 2>&1

mkdir -p ./current/editions/bluelightav > /dev/null 2>&1

# tw5-locator
rm -f -R ./build/plugins/locator > /dev/null 2>&1
mkdir -p ./build/plugins/locator > /dev/null 2>&1
cp -R ./download/tw5-locator/plugins/locator ./build/plugins || exit 1

# tw5-relink
rm -f -R ./build/plugins/relink > /dev/null 2>&1
mkdir -p ./build/plugins/relink > /dev/null 2>&1
cp -R ./download/tw5-relink/plugins/relink ./build/plugins || exit 1

# assets
cp -R ./editions/bluelightav-raw/* ./build || exit 1
cp ./production/tiddlywiki-ipfs/documentation/\$_ipfs_documentation.json-build.tid ./build/tiddlers/config/bluelightav-\$_ipfs_documentation.json-build.tid || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build raw
echo '***'
echo '*** raw bluelightav ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose || exit 1

# assets
cp -R ./editions/bluelightav/* ./build || exit 1

# check hash and set version
./bin/cli-semver.sh \
  --name=bluelightav \
  --extension=html \
  --dir=editions/bluelightav \
  --env=BLUELIGHTAV "$@" || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

echo '***'
echo '*** bluelightav ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=bluelightav \
  --extension=html \
  --dir=editions/bluelightav \
  --tags=$:/ipfs/editions "$@" || exit 1

# compress
# yarn gzipper compress --brotli production/editions/bluelightav/index.html build/output/editions/bluelightav

# done
exit 0
