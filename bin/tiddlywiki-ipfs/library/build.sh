#!/usr/bin/env zsh
echo '*** library ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
rm -f -R ./build/output/tiddlywiki-ipfs/library
mkdir -p ./build/output/tiddlywiki-ipfs/library
rm -f -R ./production/tiddlywiki-ipfs/library
mkdir -p ./production/tiddlywiki-ipfs/library
rm -f -R ./build/tiddlers
mkdir -p ./build/tiddlers
rm -f -R ./build/plugins
mkdir -p ./current/tiddlywiki-ipfs/library

# libraries
cp ./download/detect-provider/detect-provider.min.js ./build/tiddlers/detect-provider.min.js
cp ./download/ethereumjs-util/ethereumjs-util.umd.min.js ./build/tiddlers/ethereumjs-util.umd.min.js
cp ./download/keccak/keccak.umd.min.js ./build/tiddlers/keccak.umd.min.js
cp ./download/loglevel/loglevel.min.js ./build/tiddlers/loglevel.min.js
cp ./download/pako/pako.min.js ./build/tiddlers/pako.min.js

# # meta
cp ./core/library/ipfs-library-bundle.js.tid ./build/tiddlers/ipfs-library-bundle.js.tid
cp ./core/library/detect-provider.min.js.meta ./build/tiddlers/detect-provider.min.js.meta
cp ./core/library/ethereumjs-util.umd.min.js.meta ./build/tiddlers/ethereumjs-util.umd.min.js.meta
cp ./core/library/keccak.umd.min.js.meta ./build/tiddlers/keccak.umd.min.js.meta
cp ./core/library/loglevel.min.js.meta ./build/tiddlers/loglevel.min.js.meta
cp ./core/library/pako.min.js.meta ./build/tiddlers/pako.min.js.meta

# bundle
cp ./editions/library-bundle/tiddlywiki.info ./build/tiddlywiki.info

# build
echo '*** build library bundle ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# build library
rm -f -R ./build/tiddlers
mkdir -p ./build/tiddlers

# assets
cp './build/output/tiddlywiki-ipfs/library/$_library_ipfs-library-modules.js' './build/tiddlers/$_library_ipfs-library-modules.js'

# meta
cp './core/library/$_library_ipfs-library-modules.js.meta' './build/tiddlers/$_library_ipfs-library-modules.js.meta'

# library
cp ./editions/library/tiddlywiki.info ./build/tiddlywiki.info

# build raw
echo '*** build raw library ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# check hash and set version
echo '*** build library semver ***'
node ./bin/tiddlywiki-ipfs/library/semver.js "$@" || exit 1

# build
echo '*** build library ***'
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
echo '*** upload library ***'
./bin/cli-upload.sh \
  --name=$:/library/ipfs-library-modules.js \
  --owner=$:/library/ipfs-library-modules.js \
  --extension=json \
  --dir=tiddlywiki-ipfs/library \
  --tags=$:/ipfs/core || exit 1

# done
exit 0
