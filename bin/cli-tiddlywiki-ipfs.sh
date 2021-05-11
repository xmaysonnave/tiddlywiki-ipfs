#!/usr/bin/env zsh
echo '***'
echo '*** cli-tiddlywiki-ipfs ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# node
export NODE_PATH=.

# run
node ./cli-tiddlywiki-ipfs.js "$@" || exit 1

# done
exit 0
