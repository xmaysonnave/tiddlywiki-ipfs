#!/usr/bin/env zsh
echo '*** init-step ***'

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
mkdir -p ./build/tiddlers/modules > /dev/null 2>&1
mkdir -p ./build/tiddlers/core/templates > /dev/null 2>&1
mkdir -p ./build/tiddlers/core/modules/filters > /dev/null 2>&1
mkdir -p ./build/tiddlers/core/modules/commands > /dev/null 2>&1
mkdir -p ./build/tiddlers/core/modules/widgets > /dev/null 2>&1

# done
exit 0
