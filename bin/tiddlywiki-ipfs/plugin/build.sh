#!/usr/bin/env zsh
echo '***'
echo '*** plugin ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
rm -f -R ./build/output/tiddlywiki-ipfs/plugin > /dev/null 2>&1
mkdir -p ./build/output/tiddlywiki-ipfs/plugin > /dev/null 2>&1
rm -f -R ./production/tiddlywiki-ipfs/plugin > /dev/null 2>&1
mkdir -p ./production/tiddlywiki-ipfs/plugin > /dev/null 2>&1
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1
rm -f -R ./build/plugins > /dev/null 2>&1
mkdir -p ./current/tiddlywiki-ipfs/plugin > /dev/null 2>&1

# assets
mkdir -p ./build/plugins/ipfs > /dev/null 2>&1
cp -R ./core/* ./build/plugins/ipfs || exit 1
rm ./build/plugins/ipfs/modules/ipfs-bundle.js > /dev/null 2>&1
rm -R ./build/plugins/ipfs/modules/ipfs-bundle > /dev/null 2>&1
cp './production/tiddlywiki-ipfs/boot/$_boot_boot.js_build.tid' './build/plugins/ipfs/config/$_boot_boot.js_build.tid' || exit 1
cp './production/tiddlywiki-ipfs/library/$_library_ipfs-library-modules.js_build.tid' './build/plugins/ipfs/config/$_library_ipfs-library-modules.js_build.tid' || exit 1
cp ./editions/plugin/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# bundle
echo '*** browserify ipfs-bundle ***'
yarn browserify \
  core/modules/ipfs-bundle.js \
  -s IpfsBundle \
    -o build/plugins/ipfs/core/modules/ipfs-bundle.js || exit 1

# build raw
echo '*** raw plugin ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# check hash and set version
echo '*** semver plugin ***'
node ./bin/tiddlywiki-ipfs/plugin/semver.js "$@" || exit 1

# build
echo '*** plugin ***'
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
