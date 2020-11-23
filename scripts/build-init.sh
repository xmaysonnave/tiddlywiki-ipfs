#!/usr/bin/env zsh
echo '*** build-init ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# cleanup
rm -f -R ./build > /dev/null 2>&1
rm -f -R ./production > /dev/null 2>&1
rm -f -R ./sample > /dev/null 2>&1
# build directory layout
mkdir -p ./build/output > /dev/null 2>&1
mkdir ./production > /dev/null 2>&1
mkdir ./sample > /dev/null 2>&1

# format and lint
yarn prettier-standard || exit 1

# target
yarn browserslist

# done
exit 0
