#!/usr/bin/env zsh
echo '*** test ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# test
yarn jest --verbose || exit 1

# done
exit 0