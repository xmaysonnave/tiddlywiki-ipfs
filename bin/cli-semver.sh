#!/usr/bin/env zsh
echo '***'
echo '*** cli-semver ***'
echo '***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use > /dev/null 2>&1

# semver
node ./bin/cli-semver.js "$@"
if [ $? -gt 1 ];
then
  exit 2
fi
exit 0