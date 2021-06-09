#!/usr/bin/env zsh
echo '***'
echo '*** cli-build-loader ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# node
export NODE_PATH=.

# load
node ./bin/cli-build-loader.js "$@" || exit 1

# done
exit 0