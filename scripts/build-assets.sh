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
cp -R ./editions/build-library/* ./build > /dev/null 2>&1
# update build number
./scripts/run-update-build-semver.sh || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# publish to ipfs
./scripts/run-ipfs-publish.sh "$:/library/ipfs-library-modules.js" "json" || exit 1
# build boot
cp -R ./editions/build-boot/* ./build > /dev/null 2>&1
# update build number
./scripts/run-update-build-semver.sh || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# publish to ipfs
./scripts/run-ipfs-publish.sh "$:/boot/boot.js" "json" || exit 1
# build plugin
cp -R ./editions/build-plugin/* ./build > /dev/null 2>&1
# update build number
./scripts/run-update-build-semver.sh || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# publish to ipfs
./scripts/run-ipfs-publish.sh "$:/plugins/ipfs" "json" || exit 1
# done
exit 0
