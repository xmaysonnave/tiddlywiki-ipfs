#!/usr/bin/env zsh
echo '*** run-build-semver ***'
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use
# build
node ./scripts/build-semver.js || exit 1
# done
exit 0