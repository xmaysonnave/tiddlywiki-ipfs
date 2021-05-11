#!/usr/bin/env zsh
echo '***'
echo '*** build empty import html ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# node
export NODE_PATH=.

# cleanup
find ./sample -name "empty-import-html*.*" -delete > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

# assets
cp ./editions/empty-import-html/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

echo '***'
echo '*** empty import html ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --output sample \
  --build \
  --verbose "$@" || exit 1

# done
exit 0
