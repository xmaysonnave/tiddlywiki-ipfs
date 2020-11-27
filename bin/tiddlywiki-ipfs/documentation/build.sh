#!/usr/bin/env zsh
echo '*** documentation ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./bin/init-step.sh || exit 1
mkdir -p ./current/tiddlywiki-ipfs/documentation > /dev/null 2>&1
# assets
FILE="./production/tiddlywiki-ipfs/plugin/\$_plugins_ipfs_build.tid"
if [[ ! -f "$FILE" ]]; then
    echo "$FILE does not exist..."
    exit 1
fi
cp "./production/tiddlywiki-ipfs/plugin/\$_plugins_ipfs_build.tid" ./build/tiddlers/config
cp -R ./editions/documentation/* ./build > /dev/null 2>&1
cp -R ./editions/documentation/tiddlywiki.info ./build > /dev/null 2>&1
# build raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
./bin/cli-semver.sh \
  --name=$:/ipfs/documentation \
  --extension=json \
  --dir=tiddlywiki-ipfs/documentation \
  --env=DOCUMENTATION || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1

# upload to ipfs
./bin/cli-upload.sh \
  --name=$:/ipfs/documentation \
  --owner=$:/ipfs/documentation \
  --extension=json \
  --dir=tiddlywiki-ipfs/documentation \
  --tags=$:/ipfs/documentation || exit 1

# done
exit 0