#!/usr/bin/env zsh
echo '***'
echo '*** build documentation ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# node
export NODE_PATH=.

# init
rm -f -R ./build/output/tiddlywiki-ipfs/documentation > /dev/null 2>&1
mkdir -p ./build/output/tiddlywiki-ipfs/documentation > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers/dependency > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

mkdir -p ./current/tiddlywiki-ipfs/documentation > /dev/null 2>&1

# assets
cp -R ./editions/documentation/* ./build || exit 1

cp ./production/tiddlywiki-ipfs/plugin/\$_plugins_ipfs.json.json-build.tid ./build/tiddlers/dependency || exit 1
cp ./production/tiddlywiki-ipfs/plugin/\$_plugins_ipfs.zlib.json-build.tid ./build/tiddlers/dependency || exit 1
cp ./production/tiddlywiki-ipfs/plugin/\$_plugins_ipfs.zlib.ipfs.json-build.tid ./build/tiddlers/dependency || exit 1

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
node ./bin/tiddlywiki-ipfs/documentation/semver.js "$@"
if [ $? -gt 1 ];
then
  echo "*** Unchanged '$:/ipfs/documentation' ***"
  exit 0
fi

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
./bin/cli-uploader.sh \
  --name=$:/ipfs/documentation \
  --extension=json \
  --dir=tiddlywiki-ipfs/documentation \
  --tags=$:/ipfs/documentation "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/ipfs/documentation.zlib \
  --extension=json \
  --dir=tiddlywiki-ipfs/documentation \
  --tags=$:/ipfs/documentation "$@" || exit 1

# done
exit 0