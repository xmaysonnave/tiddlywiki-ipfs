#!/usr/bin/env zsh
echo '*** build-editions ***'
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use
# empty edition
./scripts/build-empty.sh || exit 1
# bluelightav edition
cp -R ./editions/bluelightav.eth/* ./build > /dev/null 2>&1
# update build number
./scripts/run-update-build-number.sh || exit 1
# tw5-locator
cp -R ./tw5-locator/plugins/locator ./build/plugins/locator > /dev/null 2>&1
# tw5-relink
cp -R ./tw5-relink/plugins/relink ./build/plugins/relink > /dev/null 2>&1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# bluelightav dev edition
cp -R ./editions/dev/* ./build > /dev/null 2>&1
# update build number
./scripts/run-update-build-number.sh || exit 1
# build
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose || exit 1
# compress
# yarn gzipper compress --brotli production/dev.html sample
# yarn gzipper compress --brotli production/index.html sample
# done
exit 0
