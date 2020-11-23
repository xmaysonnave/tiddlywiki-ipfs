#!/usr/bin/env zsh
echo '*** build-init-step ***'

# env
setopt extendedglob
# cleanup
rm -f -R ./build/^output* > /dev/null 2>&1
# step directory layout
mkdir -p ./build/plugins > /dev/null 2>&1
mkdir -p ./build/tiddlers > /dev/null 2>&1
mkdir -p ./build/tiddlers/boot > /dev/null 2>&1
mkdir -p ./build/tiddlers/config > /dev/null 2>&1
mkdir -p ./build/tiddlers/system > /dev/null 2>&1

# done
exit 0
