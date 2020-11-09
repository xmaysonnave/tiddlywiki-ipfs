#!/usr/bin/env zsh
echo '*** run-browserify ***'
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use
# target
yarn browserslist
yarn browserify \
  src/plugins/ipfs/ipfs-bundle.js \
  -s IpfsBundle \
    -o build/plugins/ipfs/ipfs-bundle.js || exit 1
yarn browserify \
  node_modules/keccak/js.js \
  -s createKeccakHash \
  -o build/tiddlers/system/keccak.umd.js || exit 1
yarn terser \
  build/tiddlers/system/keccak.umd.js \
  -c toplevel,sequences=false -m \
  -o build/tiddlers/system/keccak.umd.min.js || exit 1
# cleanup
rm ./build/tiddlers/system/keccak.umd.js > /dev/null 2>&1
# done
exit 0
