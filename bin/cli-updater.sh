#!/usr/bin/env zsh
echo '***'
echo '*** cli-updater ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# update builds
node ./bin/cli-updater.js "$@" || exit 1

# done
exit 0