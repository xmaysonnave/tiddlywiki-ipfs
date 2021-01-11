#!/usr/bin/env zsh
echo '***'
echo '*** download ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# cleanup
rm -f -R ./download > /dev/null 2>&1

# keccak
mkdir -p ./download/keccak > /dev/null 2>&1
echo '*** browserify keccak ***'
yarn browserify \
  node_modules/keccak/js.js \
  -s createKeccakHash \
  -o download/keccak/keccak.umd.js || exit 1
yarn terser \
  download/keccak/keccak.umd.js \
  -c toplevel,sequences=false -m \
  -o download/keccak/keccak.umd.min.js || exit 1

# down
cd download

# @metamask/detect-provider
mkdir detect-provider > /dev/null 2>&1
wget https://cdn.jsdelivr.net/npm/@metamask/detect-provider@1.2.0/dist/detect-provider.min.js -O ./detect-provider/detect-provider.min.js || exit 1

# loglevel
mkdir loglevel > /dev/null 2>&1
wget https://cdn.jsdelivr.net/npm/loglevel@1.7.1/dist/loglevel.min.js -O ./loglevel/loglevel.min.js || exit 1

# pako
mkdir pako > /dev/null 2>&1
wget https://cdn.jsdelivr.net/npm/pako@2.0.3/dist/pako.min.js -O ./pako/pako.min.js || exit 1

# tw5-locator
git clone https://github.com/bimlas/tw5-locator || exit 1
cd tw5-locator
git checkout tags/v2.0.1 || exit 1
cd ..

# tw5-relink
git clone https://github.com/flibbles/tw5-relink || exit 1
cd tw5-relink
git checkout tags/v1.10.2 || exit 1
cd ..

# up
cd ..

# done
exit 0
