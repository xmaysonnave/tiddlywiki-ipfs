#!/usr/bin/env zsh
echo '*** plugin ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
rm -f -R ./build/output/tiddlywiki-ipfs/plugin
mkdir -p ./build/output/tiddlywiki-ipfs/plugin
rm -f -R ./production/tiddlywiki-ipfs/plugin
mkdir -p ./production/tiddlywiki-ipfs/plugin
rm -f -R ./build/tiddlers
mkdir -p ./build/tiddlers
rm -f -R ./build/plugins
mkdir -p ./current/tiddlywiki-ipfs/plugin

# assets
mkdir -p ./build/plugins/ipfs
cp -R ./core/* ./build/plugins/ipfs
rm ./build/plugins/ipfs/modules/ipfs-bundle.js
rm -R ./build/plugins/ipfs/modules/ipfs-bundle
FILE='./production/tiddlywiki-ipfs/boot/$_boot_boot.js_build.tid'
if [[ ! -f "$FILE" ]]; then
    echo "$FILE does not exist..."
    exit 1
fi
cp './production/tiddlywiki-ipfs/boot/$_boot_boot.js_build.tid' './build/plugins/ipfs/config/$_boot_boot.js_build.tid'
FILE='./production/tiddlywiki-ipfs/library/$_library_ipfs-library-modules.js_build.tid'
if [[ ! -f "$FILE" ]]; then
    echo "$FILE does not exist..."
    exit 1
fi
cp './production/tiddlywiki-ipfs/library/$_library_ipfs-library-modules.js_build.tid' './build/plugins/ipfs/config/$_library_ipfs-library-modules.js_build.tid'
cp ./editions/plugin/tiddlywiki.info ./build/tiddlywiki.info

# bundle
echo '*** build ipfs-bundle ***'
yarn browserify \
  core/modules/ipfs-bundle.js \
  -s IpfsBundle \
    -o build/plugins/ipfs/core/modules/ipfs-bundle.js || exit 1

# build raw
echo '*** build raw plugin ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# check hash and set version
echo '*** build plugin semver ***'
node ./bin/tiddlywiki-ipfs/plugin/semver.js "$@" || exit 1

# build
echo '*** build plugin ***'
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
echo '*** upload plugin ***'
./bin/cli-upload.sh \
  --name=$:/plugins/ipfs.js \
  --owner=$:/plugins/ipfs \
  --extension=json \
  --dir=tiddlywiki-ipfs/plugin \
  --tags=$:/ipfs/documentation || exit 1

# done
exit 0
