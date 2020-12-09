#!/usr/bin/env zsh
echo '***'
echo '*** init ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# cleanup
rm -f -R ./build > /dev/null 2>&1
rm -f -R ./sample > /dev/null 2>&1

# build directory layout
mkdir -p ./build/output/pin > /dev/null 2>&1
mkdir ./sample > /dev/null 2>&1

# format and lint
echo '***'
echo '*** prettier-standard ***'
echo '***'
yarn prettier-standard "$@" || exit 1

# target
echo '***'
echo '*** target ***'
echo '***'
yarn browserslist "$@" || exit 1

# done
exit 0
