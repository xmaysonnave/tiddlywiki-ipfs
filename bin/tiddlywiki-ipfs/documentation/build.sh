#!/usr/bin/env zsh
echo '*** documentation ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
rm -f -R ./build/output/tiddlywiki-ipfs/documentation
mkdir -p ./build/output/tiddlywiki-ipfs/documentation
rm -f -R ./production/tiddlywiki-ipfs/documentation
mkdir -p ./production/tiddlywiki-ipfs/documentation
mkdir -p ./current/tiddlywiki-ipfs/documentation
rm -f -R ./build/tiddlers
mkdir -p ./build/tiddlers/config
rm -f -R ./build/plugins
mkdir -p ./current/tiddlywiki-ipfs/documentation

# assets
FILE='./production/tiddlywiki-ipfs/plugin/$_plugins_ipfs.js_build.tid'
if [[ ! -f "$FILE" ]]; then
    echo "$FILE does not exist..."
    exit 1
fi
cp './production/tiddlywiki-ipfs/plugin/$_plugins_ipfs.js_build.tid' './build/tiddlers/config/$_plugins_ipfs.js_build.tid'
cp -R ./editions/documentation/* ./build

# build raw
echo '*** build raw documentation ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# check hash and set version
echo '*** build documentation semver ***'
./bin/cli-semver.sh \
  --name=$:/ipfs/documentation \
  --extension=json \
  --dir=tiddlywiki-ipfs/documentation \
  --env=DOCUMENTATION || exit 1

# build
echo '*** build documentation ***'
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
echo '*** upload documentation ***'
./bin/cli-upload.sh \
  --name=$:/ipfs/documentation.json \
  --owner=$:/ipfs/documentation \
  --extension=json \
  --dir=tiddlywiki-ipfs/documentation \
  --tags=$:/ipfs/documentation || exit 1

# done
exit 0