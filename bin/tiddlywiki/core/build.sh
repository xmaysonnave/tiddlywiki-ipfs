#!/usr/bin/env zsh
echo '***'
echo '*** build tiddlywiki core ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# node
export NODE_PATH=.

# init
rm -f -R ./build/output/tiddlywiki/core > /dev/null 2>&1
rm -f -R ./build/plugins > /dev/null 2>&1
rm -f -R ./build/themes > /dev/null 2>&1
rm -f -R ./build/tiddlers > /dev/null 2>&1

mkdir -p ./build/output/tiddlywiki/core > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1
mkdir -p ./current/tiddlywiki/core > /dev/null 2>&1

cp ./editions/core/tiddlywiki.info ./build || exit 1

# build raw
echo '***'
echo '*** raw tiddlywiki core ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose "$@" || exit 1

# check hash and set version
echo '***'
echo '*** semver tiddywiki core ***'
echo '***'
node ./bin/tiddlywiki/core/semver.js "$@"
if [ $? -gt 1 ];
then
  echo "*** Unchanged '$:/core' ***"
  exit 0
fi

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build
echo '***'
echo '*** tiddlywiki core ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/core.json \
  --extension=json \
  --dir=tiddlywiki/core \
  --tags="$:/core $:/ipfs/documentation" "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/core.zlib \
  --extension=json \
  --dir=tiddlywiki/core \
  --tags="$:/core $:/ipfs/documentation" "$@" || exit 1

node ./bin/tiddlywiki/core/plugin-info.js "$@"

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/core.zlib.ipfs \
  --extension=json \
  --dir=tiddlywiki/core \
  --tags="$:/core $:/ipfs/documentation" "$@" || exit 1

# done
exit 0
