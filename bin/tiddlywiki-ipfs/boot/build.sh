#!/usr/bin/env zsh
echo '***'
echo '*** build boot ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# init
rm -f -R ./build/output/tiddlywiki-ipfs/boot > /dev/null 2>&1
mkdir -p ./build/output/tiddlywiki-ipfs/boot > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

rm -f -R ./production/tiddlywiki-ipfs/boot > /dev/null 2>&1
mkdir -p ./production/tiddlywiki-ipfs/boot > /dev/null 2>&1

mkdir -p ./current/tiddlywiki-ipfs/boot > /dev/null 2>&1

# boot
cp ./boot/boot.js ./build/tiddlers/boot.js || exit 1
cp ./boot/ipfs-boot.js ./build/tiddlers/ipfs-boot.js || exit 1

# meta
cp ./core/boot/boot.js.meta ./build/tiddlers/boot.js.meta || exit 1
cp ./core/boot/ipfs-boot.js.meta ./build/tiddlers/ipfs-boot.js.meta || exit 1
cp ./core/boot/ipfs-boot-bundle.tid ./build/tiddlers/ipfs-boot-bundle.tid || exit 1

# bundle
cp ./editions/boot-bundle/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# build
echo '***'
echo '*** bundle boot ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose || exit 1

# build boot
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

# assets
cp ./build/output/tiddlywiki-ipfs/boot/\$_boot_boot.js ./build/tiddlers || exit 1
# meta
cp ./core/boot/\$_boot_boot.js.meta ./build/tiddlers || exit 1
# boot
cp ./editions/boot/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# build raw
echo '***'
echo '*** raw boot ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose || exit 1

# check hash and set version
echo '***'
echo '*** semver boot ***'
echo '***'
node ./bin/tiddlywiki-ipfs/boot/semver.js "$@" || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build
echo '***'
echo '*** boot ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/boot/boot.js.json \
  --extension=json \
  --dir=tiddlywiki-ipfs/boot \
  --tags="$:/ipfs/core $:/core $:/boot/bundle" "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/boot/boot.js \
  --extension=js \
  --dir=tiddlywiki-ipfs/boot \
  --tags="$:/ipfs/core $:/core $:/boot/bundle" "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/boot/boot.js.zlib \
  --extension=json \
  --dir=tiddlywiki-ipfs/boot \
  --tags="$:/ipfs/core $:/core $:/boot/bundle" "$@" || exit 1

# done
exit 0
