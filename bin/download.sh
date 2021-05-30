#!/usr/bin/env zsh
echo '***'
echo '*** download ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# keccak
if [ ! -e ./download/keccak ]
then
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
fi

# down
cd download

# @metamask/detect-provider
if [ ! -e ./detect-provider ]
then
  mkdir detect-provider > /dev/null 2>&1
  wget https://cdn.jsdelivr.net/npm/@metamask/detect-provider@1.2.0/dist/detect-provider.min.js -O ./detect-provider/detect-provider.min.js || exit 1
fi

# ipfs-http-client
if [ ! -e ./ipfs-http-client ]
then
  mkdir ipfs-http-client > /dev/null 2>&1
  wget https://cdn.jsdelivr.net/npm/ipfs-http-client@50.1.0/dist/index.min.js -O ./ipfs-http-client/ipfs-http-client.min.js || exit 1
fi

# loglevel
if [ ! -e ./loglevel ]
then
  mkdir loglevel > /dev/null 2>&1
  wget https://cdn.jsdelivr.net/npm/loglevel@1.7.1/dist/loglevel.min.js -O ./loglevel/loglevel.min.js || exit 1
fi

# pako
if [ ! -e ./pako ]
then
  mkdir pako > /dev/null 2>&1
  wget https://cdn.jsdelivr.net/npm/pako@2.0.3/dist/pako.min.js -O ./pako/pako.min.js || exit 1
fi

# sjcl
if [ ! -e ./sjcl ]
then
  mkdir sjcl > /dev/null 2>&1
  wget https://cdn.jsdelivr.net/npm/sjcl@1.0.8/sjcl.min.js -O ./sjcl/sjcl.min.js || exit 1
fi

# tw5-locator
if [ ! -e ./tw5-locator ]
then
  git clone https://github.com/bimlas/tw5-locator || exit 1
  cd tw5-locator
  git checkout tags/v2.0.1 || exit 1
  cd ..
fi

# tw5-relink
if [ ! -e ./tw5-relink ]
then
  git clone https://github.com/flibbles/tw5-relink || exit 1
  cd tw5-relink
  git checkout tags/v2.0.0 || exit 1
  cd ..
fi

# tiddlywiki
if [ ! -e ./tiddlywiki ]
then
  mkdir tiddlywiki > /dev/null 2>&1
  wget https://tiddlywiki.com/index.html -O ./tiddlywiki/index.html || exit 1
fi

# up
cd ..

# done
exit 0
