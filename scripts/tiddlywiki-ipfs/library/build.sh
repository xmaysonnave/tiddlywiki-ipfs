#!/usr/bin/env zsh
echo '*** library ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./scripts/init-step.sh || exit 1
mkdir -p ./current/tiddlywiki-ipfs/library > /dev/null 2>&1
# download libraries
cp ./download/detect-provider/detect-provider.min.js ./build/tiddlers/system > /dev/null 2>&1
cp ./download/loglevel/loglevel.min.js ./build/tiddlers/system > /dev/null 2>&1
cp ./download/pako/pako.min.js ./build/tiddlers/system > /dev/null 2>&1
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
cp -R ./editions/library/tiddlywiki.info ./build > /dev/null 2>&1
# build
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# build tiddlywiki library
./scripts/init-step.sh || exit 1
# assets
cp ./tiddlers/library/ipfs-library-modules.js.meta ./build/tiddlers/system > /dev/null 2>&1
cp ./build/output/tiddlywiki-ipfs/library/ipfs-library-modules.js ./build/tiddlers/system > /dev/null 2>&1
cp ./src/plugins/ipfs/ipfs-filters.js ./build/tiddlers/core/modules/filters > /dev/null 2>&1
cp -R ./editions/library-modules/tiddlywiki.info ./build > /dev/null 2>&1
# build raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
node ./scripts/tiddlywiki-ipfs/library/semver.js "$@" || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# done
exit 0
