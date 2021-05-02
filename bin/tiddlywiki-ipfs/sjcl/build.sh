#!/usr/bin/env zsh
echo '***'
echo '*** build sjcl ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# init
rm -f -R ./build/output/tiddlywiki-ipfs/sjcl > /dev/null 2>&1
mkdir -p ./build/output/tiddlywiki-ipfs/sjcl > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

rm -f -R ./production/tiddlywiki-ipfs/sjcl > /dev/null 2>&1
mkdir -p ./production/tiddlywiki-ipfs/sjcl > /dev/null 2>&1

mkdir -p ./current/tiddlywiki-ipfs/sjcl > /dev/null 2>&1

# asset
cp ./download/sjcl/sjcl.min.js ./build/tiddlers/\$_library_sjcl.js || exit 1
# meta
cp ./core/library/\$_library_sjcl.js.meta ./build/tiddlers || exit 1
# sjcl
cp ./editions/sjcl/tiddlywiki.info ./build/tiddlywiki.info || exit 1


# build raw
echo '***'
echo '*** raw sjcl ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose || exit 1

# check hash and set version
echo '***'
echo '*** semver sjcl ***'
echo '***'
node ./bin/tiddlywiki-ipfs/sjcl/semver.js "$@" || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build
echo '***'
echo '*** sjcl ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/library/sjcl.js.json \
  --extension=json \
  --dir=tiddlywiki-ipfs/sjcl \
  --tags=$:/core/library/sjcl "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/library/sjcl.js \
  --extension=js \
  --dir=tiddlywiki-ipfs/sjcl \
  --tags=$:/core/library/sjcl "$@" || exit 1

# done
exit 0
