#!/usr/bin/env zsh
echo '*** build-editions ***'
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use
# build empty edition
./scripts/build-empty.sh || exit 1
# build bluelightav edition
cp -R ./editions/bluelightav.eth/* ./build > /dev/null 2>&1
# tw5-locator
cp -R ./tw5-locator/plugins/locator ./build/plugins/locator > /dev/null 2>&1
# tw5-relink
cp -R ./tw5-relink/plugins/relink ./build/plugins/relink > /dev/null 2>&1
# raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
./scripts/run-set-semver.sh \
  --name=index \
  --extension=html \
  --env=BLUELIGHTAV || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# publish to ipfs
./scripts/run-ipfs-publish.sh \
  --name=index \
  --extension=html || exit 1
# build documentation
cp -R ./editions/build-documentation/* ./build > /dev/null 2>&1
# raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
./scripts/run-set-semver.sh \
  --name=$:/ipfs/documentation \
  --extension=json \
  --env=DOCUMENTATION || exit 1
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# publish to ipfs
./scripts/run-ipfs-publish.sh \
  --name=$:/ipfs/documentation \
  --extension=json \
  --tags=$:/ipfs/documentation || exit 1
# build bluelightav dev edition
cp -R ./editions/dev/* ./build > /dev/null 2>&1
# raw
yarn ipfs-tiddlywiki build \
  --build \
  --verbose || exit 1
# check hash and set version
./scripts/run-set-semver.sh \
  --name=dev \
  --extension=html \
  --env=DEV || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# publish to ipfs
./scripts/run-ipfs-publish.sh \
  --name=dev \
  --extension=html || exit 1
# compress
# yarn gzipper compress --brotli production/dev.html sample
# yarn gzipper compress --brotli production/index.html sample
# done
exit 0
