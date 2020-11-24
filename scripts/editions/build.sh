#!/usr/bin/env zsh
echo '*** build editions ***'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use

# build empty
# ./scripts/editions/empty/build.sh "$@" || exit 1
# node ./scripts/editions/empty/upload.js "$@" || exit 1

# build bluelightav.eth
# ./scripts/editions/bluelightav/build.sh "$@" || exit 1
# node ./scripts/editions/bluelightav/upload.js "$@" || exit 1

# build dev
./scripts/editions/dev/build.sh "$@" || exit 1
node ./scripts/editions/dev/upload.js "$@" || exit 1

# done
exit 0
