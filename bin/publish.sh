#!/usr/bin/env zsh
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# publish plugin
./bin/tiddlywiki-ipfs/publish.sh || exit 1

# publish editions
./bin/editions/publish.sh || exit 1

# done
exit 0
