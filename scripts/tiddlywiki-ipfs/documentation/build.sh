#!/usr/bin/env zsh
echo '*** documentation ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./scripts/init-step.sh || exit 1
mkdir -p ./current/tiddlywiki-ipfs/documentation > /dev/null 2>&1
# assets
FILE="./production/tiddlywiki-ipfs/plugin/\$_plugins_ipfs_build.tid"
if [[ ! -f "$FILE" ]]; then
    echo "$FILE does not exist..."
    exit 1
fi
cp "./production/tiddlywiki-ipfs/plugin/\$_plugins_ipfs_build.tid" ./build/tiddlers/config
cp -R ./editions/documentation/* ./build > /dev/null 2>&1
cp ./src/plugins/ipfs/ipfs-filters.js ./build/tiddlers/core/modules/filters > /dev/null 2>&1
cp -R ./editions/documentation/tiddlywiki.info ./build > /dev/null 2>&1
# build raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
node ./scripts/tiddlywiki-ipfs/documentation/semver.js "$@" || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# done
exit 0