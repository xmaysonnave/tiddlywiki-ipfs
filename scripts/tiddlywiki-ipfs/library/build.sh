#!/usr/bin/env zsh
echo '*** build library ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# build library
./scripts/build-init-step.sh || exit 1
# download libraries
wget https://cdn.jsdelivr.net/npm/@metamask/detect-provider@1.2.0/dist/detect-provider.min.js -O ./build/tiddlers/system/detect-provider.min.js
wget https://cdn.jsdelivr.net/npm/loglevel@1.7.0/dist/loglevel.min.js -O ./build/tiddlers/system/loglevel.min.js
wget https://cdn.jsdelivr.net/npm/pako@2.0.2/dist/pako.min.js -O ./build/tiddlers/system/pako.min.js
# build keccak
yarn browserify \
  node_modules/keccak/js.js \
  -s createKeccakHash \
  -o build/tiddlers/system/keccak.umd.js || exit 1
yarn terser \
  build/tiddlers/system/keccak.umd.js \
  -c toplevel,sequences=false -m \
  -o build/tiddlers/system/keccak.umd.min.js || exit 1
# cleanup
rm ./build/tiddlers/system/keccak.umd.js > /dev/null 2>&1
# library tiddlers
cp ./tiddlers/library/* ./build/tiddlers/system > /dev/null 2>&1
# library template tiddler
cp ./tiddlers/plugins/ipfs/library/ipfs-library-modules.js.tid ./build/tiddlers/system > /dev/null 2>&1
# ipfs-library-modules.js
cp -R ./editions/build-ipfs-library-modules.js/tiddlywiki.info ./build > /dev/null 2>&1
# build
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# build tiddlywiki library
./scripts/build-init-step.sh || exit 1
# assets
cp ./tiddlers/library/ipfs-library-modules.js.meta ./build/tiddlers/system > /dev/null 2>&1
cp ./build/output/tiddlywiki-ipfs/library/ipfs-library-modules.js ./build/tiddlers/system > /dev/null 2>&1
cp ./src/plugins/ipfs/ipfs-filters.js ./build/tiddlers/system > /dev/null 2>&1
cp -R ./editions/build-library/tiddlywiki.info ./build > /dev/null 2>&1
# build raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
node ./scripts/tiddlywiki-ipfs/library/build-semver.js "$@" || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# done
exit 0
