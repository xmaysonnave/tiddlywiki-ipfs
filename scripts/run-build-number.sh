#!/usr/bin/env zsh
echo '*** run-build-number ***'
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use
# build
node ./scripts/build-number.js || exit 1
# done
exit 0