#!/usr/bin/env zsh
echo '***'
echo '*** build core ***'
echo '***'

# build core
./bin/core/core/build.sh "$@" || exit 1

# done
exit 0
