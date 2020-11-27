#!/usr/bin/env zsh
echo '*** cli semver ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# build
node ./bin/cli-semver.js "$@" || exit 1

# done
exit 0