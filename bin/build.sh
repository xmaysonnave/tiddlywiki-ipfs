#!/usr/bin/env zsh
echo '***'
echo '*** build ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# init
./bin/init.sh "$@" || exit 1

# build
./bin/download.sh "$@" || exit 1

# build plugin
./bin/tiddlywiki-ipfs/build.sh "$@" || exit 1

# build editions
./bin/editions/build.sh "$@" || exit 1

# done
exit 0
