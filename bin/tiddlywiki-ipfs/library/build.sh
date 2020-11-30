#!/usr/bin/env zsh
echo '***'
echo '*** library ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
rm -f -R ./build/output/tiddlywiki-ipfs/library > /dev/null 2>&1
mkdir -p ./build/output/tiddlywiki-ipfs/library > /dev/null 2>&1
rm -f -R ./production/tiddlywiki-ipfs/library > /dev/null 2>&1
mkdir -p ./production/tiddlywiki-ipfs/library > /dev/null 2>&1
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1
rm -f -R ./build/plugins > /dev/null 2>&1
mkdir -p ./current/tiddlywiki-ipfs/library > /dev/null 2>&1

# libraries
cp ./download/detect-provider/detect-provider.min.js ./build/tiddlers/detect-provider.min.js || exit 1
cp ./download/keccak/keccak.umd.min.js ./build/tiddlers/keccak.umd.min.js || exit 1
cp ./download/loglevel/loglevel.min.js ./build/tiddlers/loglevel.min.js || exit 1
cp ./download/pako/pako.min.js ./build/tiddlers/pako.min.js || exit 1

# meta
cp ./core/library/ipfs-library-bundle.js.tid ./build/tiddlers/ipfs-library-bundle.js.tid || exit 1
cp ./core/library/detect-provider.min.js.meta ./build/tiddlers/detect-provider.min.js.meta || exit 1
cp ./core/library/keccak.umd.min.js.meta ./build/tiddlers/keccak.umd.min.js.meta || exit 1
cp ./core/library/loglevel.min.js.meta ./build/tiddlers/loglevel.min.js.meta || exit 1
cp ./core/library/pako.min.js.meta ./build/tiddlers/pako.min.js.meta || exit 1

# bundle
cp ./editions/library-bundle/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# build
echo '*** build library bundle ***'
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# build library
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

# assets
cp './build/output/tiddlywiki-ipfs/library/$_library_ipfs-library-modules.js' './build/tiddlers/$_library_ipfs-library-modules.js' || exit 1

# meta
cp './core/library/$_library_ipfs-library-modules.js.meta' './build/tiddlers/$_library_ipfs-library-modules.js.meta' || exit 1

# library
cp ./editions/library/tiddlywiki.info ./build/tiddlywiki.info || exit 1

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
