#!/usr/bin/env zsh
echo '*** noclone ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# init
./scripts/init.sh || exit 1
# build plugin
./scripts/tiddlywiki-ipfs/build.sh || exit 1
# build editions
./scripts/editions/build.sh || exit 1

# final format and lint
yarn prettier-standard || exit 1

# done
exit 0
