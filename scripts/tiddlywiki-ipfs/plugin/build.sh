#!/usr/bin/env zsh
echo '*** build plugin ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# build plugin
./scripts/build-init-step.sh || exit 1
# assets
cp -R ./src/plugins/ipfs/core ./build/plugins/ipfs > /dev/null 2>&1
# don't copy sub-directories, they are meant to be bundled
cp ./src/plugins/ipfs/* ./build/plugins/ipfs > /dev/null 2>&1
cp -R ./tiddlers/plugins/ipfs ./build/plugins > /dev/null 2>&1
FILE="./build/output/tiddlywiki-ipfs/boot/\$_boot_boot.js_build.tid"
if [[ ! -f "$FILE" ]]; then
    echo "$FILE does not exist..."
    exit 1
fi
cp "./build/output/tiddlywiki-ipfs/boot/\$_boot_boot.js_build.tid" ./build/plugins/ipfs/config
FILE="./build/output/tiddlywiki-ipfs/library/\$_library_ipfs-library-modules.js_build.tid"
if [[ ! -f "$FILE" ]]; then
    echo "$FILE does not exist..."
    exit 1
fi
cp "./build/output/tiddlywiki-ipfs/library/\$_library_ipfs-library-modules.js_build.tid" ./build/plugins/ipfs/config
cp -R ./editions/plugin/tiddlywiki.info ./build > /dev/null 2>&1
# bundle
yarn browserify \
  src/plugins/ipfs/ipfs-bundle.js \
  -s IpfsBundle \
    -o build/plugins/ipfs/ipfs-bundle.js || exit 1
# build raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
node ./scripts/tiddlywiki-ipfs/plugin/build-semver.js "$@" || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# done
exit 0
