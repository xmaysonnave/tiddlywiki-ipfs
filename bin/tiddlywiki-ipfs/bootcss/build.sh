#!/usr/bin/env zsh
echo '***'
echo '*** build bootcss ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# node
export NODE_PATH=.

# init
rm -f -R ./build/output/tiddlywiki-ipfs/bootcss > /dev/null 2>&1
mkdir -p ./build/output/tiddlywiki-ipfs/bootcss > /dev/null 2>&1

rm -f -R ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1

rm -f -R ./build/plugins > /dev/null 2>&1

mkdir -p ./current/tiddlywiki-ipfs/bootcss > /dev/null 2>&1

# bootcss
cp ./boot/boot.css ./build/tiddlers/\$_boot_boot.css || exit 1

# meta
cp ./core/boot/\$_boot_boot.css.meta ./build/tiddlers || exit 1

# bundle
cp ./editions/bootcss/tiddlywiki.info ./build/tiddlywiki.info || exit 1


# build raw
echo '***'
echo '*** raw bootcss ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --build \
  --verbose || exit 1

# check hash and set version
echo '***'
echo '*** semver bootcss ***'
echo '***'
node ./bin/tiddlywiki-ipfs/bootcss/semver.js "$@"
if [ $? -gt 1 ];
then
  echo "*** Unchanged '$:/boot/boot.css' ***"
  exit 0
fi

# update tiddlywiki.info
node ./bin/update-info.js "$@" || exit 1

# build
echo '***'
echo '*** bootcss ***'
echo '***'
yarn tiddlywiki-ipfs build \
  --output production \
  --build \
  --verbose "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/boot/boot.css.json \
  --extension=json \
  --dir=tiddlywiki-ipfs/bootcss \
  --tags="$:/ipfs/core $:/core $:/boot/css" "$@" || exit 1

# upload to ipfs
./bin/cli-uploader.sh \
  --name=$:/boot/boot.css \
  --extension=css \
  --dir=tiddlywiki-ipfs/bootcss \
  --tags="$:/ipfs/core $:/core $:/boot/css" "$@" || exit 1

# done
exit 0
