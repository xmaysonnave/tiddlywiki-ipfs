#!/usr/bin/env zsh
echo '*** build ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./bin/init.sh || exit 1

# build
./bin/download.sh || exit 1

# build plugin
./bin/tiddlywiki-ipfs/build.sh || exit 1

# build editions
./bin/editions/build.sh || exit 1

# done
exit 0
