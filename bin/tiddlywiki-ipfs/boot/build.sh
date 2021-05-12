#!/usr/bin/env zsh
echo '***'
echo '*** build boot ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# node
export NODE_PATH=.

# init
rm -f -R ./build/output/tiddlywiki-ipfs/boot > /dev/null 2>&1
mkdir -p ./build/output/tiddlywiki-ipfs/boot > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

mkdir -p ./current/tiddlywiki-ipfs/boot > /dev/null 2>&1

# boot
cp ./boot/boot.js ./build/tiddlers || exit 1
cp ./boot/bootsuffix.js ./build/tiddlers || exit 1

# meta
cp ./core/boot/boot.js.meta ./build/tiddlers || exit 1
cp ./core/boot/bootsuffix.js.meta ./build/tiddlers || exit 1

# bundle
cp ./core/boot/boot-bundle.tid ./build/tiddlers || exit 1
cp ./editions/boot-bundle/tiddlywiki.info ./build || exit 1

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
cp ./editions/boot/tiddlywiki.info ./build || exit 1

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
node ./bin/tiddlywiki-ipfs/boot/semver.js "$@"
if [ $? -gt 1 ];
then
  echo "*** Unchanged '$:/boot/boot.js' ***"
  exit 0
fi

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

# done
exit 0
