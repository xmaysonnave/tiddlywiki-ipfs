#!/usr/bin/env zsh
echo '***'
echo '*** build plugin ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# node
export NODE_PATH=.

# init
rm -f -R ./build/output/tiddlywiki-ipfs/plugin > /dev/null 2>&1
rm -f -R ./build/plugins > /dev/null 2>&1
rm -f -R ./build/themes > /dev/null 2>&1
rm -f -R ./build/tiddlers > /dev/null 2>&1

mkdir -p ./build/output/tiddlywiki-ipfs/plugin > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1
mkdir -p ./current/tiddlywiki-ipfs/plugin > /dev/null 2>&1
mkdir -p ./build/plugins/ipfs > /dev/null 2>&1

# dependency
rm -R ./core/dependency > /dev/null 2>&1
mkdir -p ./core/dependency > /dev/null 2>&1

cp ./production/tiddlywiki-ipfs/bootcss/\$_boot_boot.css.css-build.tid ./core/dependency || exit 1
cp ./production/tiddlywiki-ipfs/bootcss/\$_boot_boot.css.json.json-build.tid ./core/dependency || exit 1
cp ./production/tiddlywiki-ipfs/bootprefix/\$_boot_bootprefix.js.js-build.tid ./core/dependency || exit 1
cp ./production/tiddlywiki-ipfs/bootprefix/\$_boot_bootprefix.js.json.json-build.tid ./core/dependency || exit 1
cp ./production/tiddlywiki-ipfs/boot/\$_boot_boot.js.js-build.tid ./core/dependency || exit 1
cp ./production/tiddlywiki-ipfs/boot/\$_boot_boot.js.json.json-build.tid ./core/dependency || exit 1
cp ./production/tiddlywiki-ipfs/sjcl/\$_library_sjcl.js.js-build.tid ./core/dependency || exit 1
cp ./production/tiddlywiki-ipfs/sjcl/\$_library_sjcl.js.json.json-build.tid ./core/dependency || exit 1
cp ./production/tiddlywiki-ipfs/library/\$_library_ipfs.js.js-build.tid ./core/dependency/ || exit 1
cp ./production/tiddlywiki-ipfs/library/\$_library_ipfs.js.json.json-build.tid ./core/dependency || exit 1

cp ./production/tiddlywiki/core/\$_core.json.json-build.tid ./core/dependency || exit 1
cp ./production/tiddlywiki/core/\$_core.zlib.json-build.tid ./core/dependency || exit 1
cp ./production/tiddlywiki/core/\$_core.zlib.ipfs.json-build.tid ./core/dependency || exit 1

# assets
cp -R ./core/* ./build/plugins/ipfs || exit 1

# cleanup browserified bundle env
rm ./build/plugins/ipfs/modules/library/ipfs-bundle.js > /dev/null 2>&1
rm -R ./build/plugins/ipfs/modules/library/ipfs-bundle > /dev/null 2>&1

cp ./editions/plugin/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# bundle
echo '***'
echo '*** browserify ipfs-bundle ***'
echo '***'
yarn browserify \
  core/modules/library/ipfs-bundle.js \
  -i eruda \
  -i $:/library/eruda.min.js \
  -i eth-sig-util \
  -i $:/library/eth-sig-util.min.js \
  -i ethers \
  -i $:/library/ethers.umd.min.js \
  -i ipfs-http-client \
  -i $:/library/ipfs-http-client.min.js \
  -i pako \
  -s IpfsBundle \
  -o build/plugins/ipfs/modules/library/ipfs-bundle.js "$@" || exit 1

# build raw
echo '***'
echo '*** raw plugin ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose "$@" || exit 1

# check hash and set version
echo '***'
echo '*** semver plugin ***'
echo '***'
node ./bin/tiddlywiki-ipfs/plugin/semver.js "$@"
if [ $? -gt 1 ];
then
  echo "*** Unchanged '$:/plugins/ipfs' ***"
  exit 0
fi

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build
echo '***'
echo '*** plugin ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/plugins/ipfs.json \
  --extension=json \
  --dir=tiddlywiki-ipfs/plugin \
  --tags="$:/ipfs/core $:/ipfs/documentation" "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/plugins/ipfs.zlib \
  --extension=json \
  --dir=tiddlywiki-ipfs/plugin \
  --tags="$:/ipfs/core $:/ipfs/documentation" "$@" || exit 1

node ./bin/tiddlywiki-ipfs/plugin/plugin-info.js "$@"

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/plugins/ipfs.zlib.ipfs \
  --extension=json \
  --dir=tiddlywiki-ipfs/plugin \
  --tags="$:/ipfs/core $:/ipfs/documentation" "$@" || exit 1

# done
exit 0
