#!/usr/bin/env zsh
echo '***'
echo '*** cli-publish-builds ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# publish
node ./bin/cli-publish-builds.js "$@" || exit 1

# done
exit 0