#!/usr/bin/env zsh
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# run
node ./ipfs-tiddlywiki.js "$@" || exit 1

# done
exit 0
