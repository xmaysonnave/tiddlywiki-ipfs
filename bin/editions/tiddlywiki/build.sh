#!/usr/bin/env zsh
echo '***'
echo '*** build tiddlywiki ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

rm -f -R ./build/output/editions/tiddlywiki > /dev/null 2>&1
mkdir -p ./build/output/editions/tiddlywiki > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

rm -f -R ./production/editions/tiddlywiki > /dev/null 2>&1
mkdir -p ./production/editions/tiddlywiki > /dev/null 2>&1

mkdir -p ./current/editions/tiddlywiki > /dev/null 2>&1

# tiddlywiki
if [ ! -e ./download/tiddlywiki/index.html ]
then
  rm -f -R ./download/tiddlywiki > /dev/null 2>&1
  cd download
  mkdir tiddlywiki > /dev/null 2>&1
  wget https://tiddlywiki.com/index.html -O ./tiddlywiki/index.html || exit 1
  cd ..
fi

# assets
cp ./editions/tiddlywiki/tiddlywiki.info ./build/tiddlywiki.info || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build raw
echo '***'
echo '*** raw tiddlywiki ***'
echo '***'
yarn cli-tiddlywiki-ipfs build \
  --build \
  --verbose "$@" || exit 1

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# check hash and set version
./bin/cli-semver.sh \
  --name=index \
  --extension=html \
  --dir=editions/tiddlywiki \
  --env=TIDDLYWIKI "$@" || exit 1

# build
echo '***'
echo '*** tiddlywiki ***'
echo '***'
yarn cli-tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-upload.sh \
  --name=index \
  --extension=html \
  --dir=editions/tiddlywiki \
  --tags=$:/ipfs/editions "$@" || exit 1

# compress
# yarn gzipper compress --brotli production/editions/tiddlywiki/index.html build/output/editions/tiddlywiki

# done
exit 0
