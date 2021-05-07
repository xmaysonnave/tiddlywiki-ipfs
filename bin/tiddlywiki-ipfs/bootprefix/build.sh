#!/usr/bin/env zsh
echo '***'
echo '*** build bootprefix ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# init
rm -f -R ./build/output/tiddlywiki-ipfs/bootprefix > /dev/null 2>&1
mkdir -p ./build/output/tiddlywiki-ipfs/bootprefix > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

mkdir -p ./current/tiddlywiki-ipfs/bootprefix > /dev/null 2>&1

# bootprefix
cp ./boot/bootprefix.js ./build/tiddlers/\$_boot_bootprefix.js || exit 1

# meta
cp ./core/boot/\$_boot_bootprefix.js.meta ./build/tiddlers || exit 1

# bundle
cp ./editions/bootprefix/tiddlywiki.info ./build/tiddlywiki.info || exit 1


# build raw
echo '***'
echo '*** raw bootprefix ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose || exit 1

# check hash and set version
echo '***'
echo '*** semver bootprefix ***'
echo '***'
node ./bin/tiddlywiki-ipfs/bootprefix/semver.js "$@"
if [ $? -gt 1 ];
then
  echo "*** Unchanged '$:/boot/bootprefix.js' ***"
  exit 0
fi

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build
echo '***'
echo '*** bootprefix ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/boot/bootprefix.js.json \
  --extension=json \
  --dir=tiddlywiki-ipfs/bootprefix \
  --tags="$:/ipfs/core $:/core $:/boot/bootprefix" "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/boot/bootprefix.js \
  --extension=js \
  --dir=tiddlywiki-ipfs/bootprefix \
  --tags="$:/ipfs/core $:/core $:/boot/bootprefix" "$@" || exit 1

# done
exit 0
