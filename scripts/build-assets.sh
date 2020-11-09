#!/usr/bin/env zsh
echo '*** build-assets ***'
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use
# ipfs-library.js
cp -R ./editions/build-ipfs-library.js/* ./build > /dev/null 2>&1
# build
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# cleanup system
rm -f -R ./build/tiddlers/system > /dev/null 2>&1
# tiddywiki-ipfs assets
mkdir -p ./build/tiddlers/system > /dev/null 2>&1
cp ./tiddlers/system/ipfs-library.js.meta ./build/tiddlers/system > /dev/null 2>&1
cp ./build/output/ipfs-library.js ./build/tiddlers/system > /dev/null 2>&1
# build
cp -R ./editions/build-ipfs-tiddlywiki/* ./build > /dev/null 2>&1
# update build number
./scripts/run-update-build-number.sh || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# done
exit 0
