#!/usr/bin/env zsh
echo '*** boot ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
rm -f -R ./build/output/tiddlywiki-ipfs/boot
mkdir -p ./build/output/tiddlywiki-ipfs/boot
rm -f -R ./production/tiddlywiki-ipfs/boot
mkdir -p ./production/tiddlywiki-ipfs/boot
rm -f -R ./build/tiddlers
mkdir -p ./build/tiddlers
rm -f -R ./build/plugins
mkdir -p ./current/tiddlywiki-ipfs/boot

# boot
cp ./boot/boot.js ./build/tiddlers/boot.js
cp ./boot/ipfs-boot.js ./build/tiddlers/ipfs-boot.js

# meta
cp ./core/boot/boot.js.meta ./build/tiddlers/boot.js.meta
cp ./core/boot/ipfs-boot.js.meta ./build/tiddlers/ipfs-boot.js.meta
cp ./core/boot/ipfs-boot-bundle.tid ./build/tiddlers/ipfs-boot-bundle.tid

# bundle
cp ./editions/boot-bundle/tiddlywiki.info ./build/tiddlywiki.info

# build
echo '*** build boot bundle ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# build boot
rm -f -R ./build/tiddlers
mkdir -p ./build/tiddlers

# assets
cp './build/output/tiddlywiki-ipfs/boot/$_boot_boot.js' './build/tiddlers/$_boot_boot.js'

# meta
cp './core/boot/$_boot_boot.js.meta' './build/tiddlers/$_boot_boot.js.meta'

# boot
cp ./editions/boot/tiddlywiki.info ./build/tiddlywiki.info

# build raw
echo '*** build raw boot ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# check hash and set version
echo '*** build boot semver ***'
node ./bin/tiddlywiki-ipfs/boot/semver.js "$@" || exit 1

# build
echo '*** build boot***'
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
echo '*** upload boot***'
./bin/cli-upload.sh \
  --name=$:/boot/boot.js \
  --owner=$:/boot/boot.js \
  --extension=json \
  --dir=tiddlywiki-ipfs/boot \
  --tags=$:/ipfs/core || exit 1

# done
exit 0
