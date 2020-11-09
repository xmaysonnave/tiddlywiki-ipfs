#!/usr/bin/env zsh
echo '*** debug-build-empty ***'
# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo 'nvm:' $(nvm -v)
nvm use
# build
./scripts/run-prepare.sh || exit 1
./scripts/run-browserify.sh || exit 1
./scripts/build-assets.sh || exit 1
# format and lint
yarn prettier-standard || exit 1
# empty edition
./scripts/build-empty.sh || exit 1
# done
exit 0
