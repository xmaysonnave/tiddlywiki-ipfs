#!/usr/bin/env zsh
echo '*** build-empty ***'
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use
# empty edition
cp -R ./editions/empty/* ./build > /dev/null 2>&1
# raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
./scripts/run-set-semver.sh \
  --name=empty \
  --extension=html \
  --env=EMPTY || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# publish to ipfs
./scripts/run-ipfs-publish.sh \
  --name=empty \
  --extension=html || exit 1
# compress
# yarn gzipper compress --brotli production/empty.html sample
# done
exit 0
