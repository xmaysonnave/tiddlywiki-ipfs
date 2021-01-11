#!/usr/bin/env zsh
echo '***'
echo '*** build empty-dev ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# init
./bin/init-editions.sh "$@" || exit 1
rm -f -R ./build/output/editions/ > /dev/null 2>&1
mkdir -p ./build/output/editions/empty-dev > /dev/null 2>&1
rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1
rm -f -R ./build/plugins > /dev/null 2>&1
find ./sample -name "empty-dev*.*" -delete > /dev/null 2>&1

# assets
cp ./editions/empty-dev/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

echo '***'
echo '*** empty dev ***'
echo '***'
yarn ipfs-tiddlywiki build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# done
exit 0
