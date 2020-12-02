#!/usr/bin/env zsh
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# cleanup
rm -f -R ./build > /dev/null 2>&1
rm -f -R ./sample > /dev/null 2>&1

# build directory layout
mkdir -p ./build/output/pin > /dev/null 2>&1
mkdir ./sample > /dev/null 2>&1

# format and lint
yarn prettier-standard || exit 1

# target
yarn browserslist || exit 1

# done
exit 0
