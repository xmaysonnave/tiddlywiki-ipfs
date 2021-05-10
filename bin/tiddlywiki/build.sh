#!/usr/bin/env zsh
echo '***'
echo '*** build tiddlywki ***'
echo '***'

# build tiddlywki core
./bin/tiddlywiki/core/build.sh "$@" || exit 1

# done
exit 0
