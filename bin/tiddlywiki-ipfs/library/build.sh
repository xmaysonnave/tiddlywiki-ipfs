#!/usr/bin/env zsh
echo '*** library ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./bin/init-step.sh || exit 1
mkdir -p ./current/tiddlywiki-ipfs/library > /dev/null 2>&1
# libraries
cp ./download/detect-provider/detect-provider.min.js ./build/tiddlers/system > /dev/null 2>&1
cp ./download/loglevel/loglevel.min.js ./build/tiddlers/system > /dev/null 2>&1
cp ./download/pako/pako.min.js ./build/tiddlers/system > /dev/null 2>&1
cp ./download/keccak/keccak.umd.min.js ./build/tiddlers/system > /dev/null 2>&1
# meta
cp ./library/bundle/* ./build/tiddlers/system > /dev/null 2>&1
# bundle
cp -R ./editions/library-bundle/tiddlywiki.info ./build > /dev/null 2>&1
# build
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1

# build tiddlywiki library
./bin/init-step.sh || exit 1
# assets
cp ./build/output/tiddlywiki-ipfs/library/ipfs-library-modules.js ./build/tiddlers/system > /dev/null 2>&1
cp ./core/modules/filters/ipfs-filters.js ./build/tiddlers/core/modules/filters > /dev/null 2>&1
# meta
cp ./library/modules/ipfs-library-modules.js.meta ./build/tiddlers/system > /dev/null 2>&1
# library
cp -R ./editions/library-modules/tiddlywiki.info ./build > /dev/null 2>&1
# build raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
node ./bin/tiddlywiki-ipfs/library/semver.js "$@" || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
./bin/cli-upload.sh \
  --name=$:/library/ipfs-library-modules.js \
  --owner=$:/library/ipfs-library-modules.js \
  --extension=json \
  --dir=tiddlywiki-ipfs/library \
  --tags=$:/ipfs/core || exit 1

# done
exit 0
