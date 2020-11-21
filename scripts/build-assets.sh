#!/usr/bin/env zsh
echo '*** build-assets ***'
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# ipfs-library-modules.js
cp -R ./editions/build-ipfs-library-modules.js/* ./build > /dev/null 2>&1
# build
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# cleanup
rm -f -R ./build/tiddlers/system > /dev/null 2>&1
mkdir -p ./build/tiddlers/system > /dev/null 2>&1

# build library modules
cp ./tiddlers/system/ipfs-library-modules.js.meta ./build/tiddlers/system > /dev/null 2>&1
cp ./build/output/ipfs-library-modules.js ./build/tiddlers/system > /dev/null 2>&1
# raw
cp -R ./editions/build-library/* ./build > /dev/null 2>&1
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
./scripts/run-set-semver.sh \
  --name=$:/library/ipfs-library-modules.js \
  --extension=json \
  --env=LIBRARY || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# publish to ipfs
./scripts/run-ipfs-publish.sh \
  --name=$:/library/ipfs-library-modules.js \
  --extension=json \
  --tags=$:/ipfs/core || exit 1

# build boot raw
cp -R ./editions/build-boot/* ./build > /dev/null 2>&1
# raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
./scripts/run-set-semver.sh \
  --name=$:/boot/boot.js \
  --extension=json \
  --env=BOOT || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# publish to ipfs
./scripts/run-ipfs-publish.sh \
  --name=$:/boot/boot.js \
  --extension=json \
  --tags=$:/ipfs/core || exit 1

# build plugin raw
cp -R ./editions/build-plugin/* ./build > /dev/null 2>&1
# raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
./scripts/run-set-semver.sh \
  --name=$:/plugins/ipfs \
  --extension=json \
  --env=PLUGIN || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# publish to ipfs
./scripts/run-ipfs-publish.sh \
  --name=$:/plugins/ipfs \
  --extension=json \
  --tags=$:/ipfs/documentation || exit 1
# done
exit 0
