#!/usr/bin/env zsh
echo '*** run-ipfs-publish ***'
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use
# build
node ./scripts/ipfs-publish.js "$@" || exit 1
# done
exit 0
