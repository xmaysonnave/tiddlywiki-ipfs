#!/usr/bin/env zsh
echo '***'
echo '*** build plugin ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# init
rm -f -R ./build/output/tiddlywiki-ipfs/plugin > /dev/null 2>&1
mkdir -p ./build/output/tiddlywiki-ipfs/plugin > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

rm -f -R ./production/tiddlywiki-ipfs/plugin > /dev/null 2>&1
mkdir -p ./production/tiddlywiki-ipfs/plugin > /dev/null 2>&1

mkdir -p ./current/tiddlywiki-ipfs/plugin > /dev/null 2>&1

# assets
mkdir -p ./build/plugins/ipfs > /dev/null 2>&1
cp -R ./core/* ./build/plugins/ipfs || exit 1
rm ./build/plugins/ipfs/modules/library/ipfs-bundle.js > /dev/null 2>&1
rm -R ./build/plugins/ipfs/modules/library/ipfs-bundle > /dev/null 2>&1
cp ./production/tiddlywiki-ipfs/boot/\$_boot_boot.js-build.tid ./build/plugins/ipfs/config/\$_boot_boot.js-build.tid || exit 1
cp ./production/tiddlywiki-ipfs/library/\$_library_ipfs-modules.js-build.tid ./build/plugins/ipfs/config/\$_library_ipfs-modules.js-build.tid || exit 1
cp ./editions/plugin/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# bundle
echo '***'
echo '*** browserify ipfs-bundle ***'
echo '***'
yarn browserify \
  core/modules/library/ipfs-bundle.js \
  -s IpfsBundle \
  -o build/plugins/ipfs/modules/library/ipfs-bundle.js "$@" || exit 1

# build raw
echo '***'
echo '*** raw plugin ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose "$@" || exit 1

# check hash and set version
echo '***'
echo '*** semver plugin ***'
echo '***'
node ./bin/tiddlywiki-ipfs/plugin/semver.js "$@" || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build
echo '***'
echo '*** plugin ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-upload.sh \
  --name=$:/plugins/ipfs.js \
  --extension=json \
  --dir=tiddlywiki-ipfs/plugin \
  --tags=$:/ipfs/documentation "$@" || exit 1

# upload to ipfs
./bin/cli-upload.sh \
  --name=$:/plugins/ipfs.js.zlib \
  --extension=json \
  --dir=tiddlywiki-ipfs/plugin \
  --tags=$:/ipfs/documentation "$@" || exit 1

# done
exit 0
