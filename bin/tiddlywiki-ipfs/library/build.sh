#!/usr/bin/env zsh
echo '***'
echo '*** build library ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# node
export NODE_PATH=.

# init
rm -f -R ./build/output/tiddlywiki-ipfs/library > /dev/null 2>&1
rm -f -R ./build/plugins > /dev/null 2>&1
rm -f -R ./build/themes > /dev/null 2>&1
rm -f -R ./build/tiddlers > /dev/null 2>&1

mkdir -p ./build/output/tiddlywiki-ipfs/library > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1
mkdir -p ./current/tiddlywiki-ipfs/library > /dev/null 2>&1

# libraries
cp ./download/eth-sig-util/eth-sig-util.min.js ./build/tiddlers/\$_eth-sig-util.min.js || exit 1
cp ./download/detect-provider/detect-provider.min.js ./build/tiddlers/\$_detect-provider.min.js || exit 1
cp ./download/keccak/keccak.umd.min.js ./build/tiddlers/\$_keccak.umd.min.js || exit 1
cp ./download/loglevel/loglevel.min.js ./build/tiddlers/\$_loglevel.min.js || exit 1
cp ./download/pako/pako.min.js ./build/tiddlers/\$_pako.min.js || exit 1

# meta
cp ./core/library/\$_library_ipfs_bundle.js.tid ./build/tiddlers || exit 1

cp ./core/library/\$_eth-sig-util.min.js.meta ./build/tiddlers || exit 1
cp ./core/library/\$_detect-provider.min.js.meta ./build/tiddlers || exit 1
cp ./core/library/\$_keccak.umd.min.js.meta ./build/tiddlers || exit 1
cp ./core/library/\$_loglevel.min.js.meta ./build/tiddlers || exit 1
cp ./core/library/\$_pako.min.js.meta ./build/tiddlers || exit 1

# bundle
cp ./editions/library-bundle/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# build
echo '***'
echo '*** bundle library ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose "$@" || exit 1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

# assets
cp ./build/output/tiddlywiki-ipfs/library/\$_library_ipfs.js ./build/tiddlers || exit 1
# meta
cp ./core/library/\$_library_ipfs.js.meta ./build/tiddlers || exit 1
# library
cp ./editions/library/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# build raw
echo '***'
echo '*** raw library ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose "$@" || exit 1

# check hash and set version
echo '***'
echo '*** semver library ***'
echo '***'
node ./bin/tiddlywiki-ipfs/library/semver.js "$@"
if [ $? -gt 1 ];
then
  echo "*** Unchanged '$:/library/ipfs.js' ***"
  exit 0
fi

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build
echo '***'
echo '*** library ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/library/ipfs.js.json \
  --extension=json \
  --dir=tiddlywiki-ipfs/library \
  --tags="$:/ipfs/core $:/core $:/library/ipfs" "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/library/ipfs.js \
  --extension=js \
  --dir=tiddlywiki-ipfs/library \
  --tags="$:/ipfs/core $:/core $:/library/ipfs" "$@" || exit 1

# done
exit 0
