#!/usr/bin/env zsh
echo '***'
echo '*** build empty import json ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# cleanup
find ./sample -name "empty-import-json*.*" -delete > /dev/null 2>&1

# init
./bin/init-editions.sh "$@" || exit 1
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1
rm -f -R ./build/plugins > /dev/null 2>&1

# assets
cp ./editions/empty-import-json/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

echo '***'
echo '*** empty import json ***'
echo '***'
yarn ipfs-tiddlywiki build \
  --output sample \
  --build \
  --verbose "$@" || exit 1

# done
exit 0
