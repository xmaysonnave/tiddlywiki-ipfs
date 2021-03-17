#!/usr/bin/env zsh
echo '***'
echo '*** build documentation ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# init
rm -f -R ./build/output/tiddlywiki-ipfs/documentation > /dev/null 2>&1
mkdir -p ./build/output/tiddlywiki-ipfs/documentation > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers/config > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

rm -f -R ./production/tiddlywiki-ipfs/documentation > /dev/null 2>&1
mkdir -p ./production/tiddlywiki-ipfs/documentation > /dev/null 2>&1

mkdir -p ./current/tiddlywiki-ipfs/documentation > /dev/null 2>&1

# assets
cp -R ./editions/documentation/* ./build || exit 1
cp ./production/tiddlywiki-ipfs/plugin/\$_plugins_ipfs.js-build.tid ./build/tiddlers/config/\$_ipfs_documentation-\$_plugins_ipfs.js-build.tid || exit 1

# build raw
echo '***'
echo '*** raw ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose || exit 1

# check hash and set version
echo '***'
echo '*** semver documentation ***'
echo '***'
node ./bin/tiddlywiki-ipfs/documentation/semver.js "$@" || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build
echo '***'
echo '*** documentation ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-upload.sh \
  --name=$:/ipfs/documentation \
  --owner=$:/ipfs/documentation \
  --extension=json \
  --dir=tiddlywiki-ipfs/documentation \
  --tags=$:/ipfs/documentation "$@" || exit 1

# upload to ipfs
./bin/cli-upload.sh \
  --name=$:/ipfs/documentation.zlib \
  --owner=$:/ipfs/documentation \
  --extension=json \
  --dir=tiddlywiki-ipfs/documentation \
  --tags=$:/ipfs/documentation "$@" || exit 1

# done
exit 0