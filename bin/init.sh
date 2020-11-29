#!/usr/bin/env zsh
echo '*** init ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# cleanup
rm -f -R ./build
rm -f -R ./sample

# build directory layout
mkdir -p ./build/output
mkdir ./sample

# format and lint
yarn prettier-standard || exit 1

# target
yarn browserslist

# done
exit 0
