#!/usr/bin/env zsh
echo '*** plugin ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./bin/init-step.sh || exit 1
mkdir -p ./current/tiddlywiki-ipfs/plugin > /dev/null 2>&1
# assets
cp -R ./core ./build/plugins/ipfs > /dev/null 2>&1
rm -R ./build/plugins/ipfs/core/modules/ipfs-bundle.js > /dev/null 2>&1
rm -R ./build/plugins/ipfs/core/modules/ipfs-bundle > /dev/null 2>&1
FILE="./production/tiddlywiki-ipfs/boot/\$_boot_boot.js_build.tid"
if [[ ! -f "$FILE" ]]; then
    echo "$FILE does not exist..."
    exit 1
fi
cp "./production/tiddlywiki-ipfs/boot/\$_boot_boot.js_build.tid" ./build/plugins/ipfs/config
FILE="./production/tiddlywiki-ipfs/library/\$_library_ipfs-library-modules.js_build.tid"
if [[ ! -f "$FILE" ]]; then
    echo "$FILE does not exist..."
    exit 1
fi
cp "./production/tiddlywiki-ipfs/library/\$_library_ipfs-library-modules.js_build.tid" ./build/plugins/ipfs/config
cp -R ./editions/plugin/tiddlywiki.info ./build > /dev/null 2>&1
# bundle
yarn browserify \
  core/modules/ipfs-bundle.js \
  -s IpfsBundle \
    -o build/plugins/ipfs/modules/ipfs-bundle.js || exit 1
# build raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
node ./bin/tiddlywiki-ipfs/plugin/semver.js "$@" || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
./bin/cli-upload.sh \
  --name=$:/plugins/ipfs \
  --owner=$:/plugins/ipfs \
  --extension=json \
  --dir=tiddlywiki-ipfs/plugin \
  --tags=$:/ipfs/documentation || exit 1

# done
exit 0
