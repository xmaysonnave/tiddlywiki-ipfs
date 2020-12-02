#!/usr/bin/env zsh
echo '*** build editions ***'

# init
./bin/init-editions.sh "$@" || exit 1

# build empty
./bin/editions/empty/build.sh "$@" || exit 1

# build bluelightav.eth
./bin/editions/bluelightav/build.sh "$@" || exit 1

# build dev
./bin/editions/dev/build.sh "$@" || exit 1

# build tiddlywiki
./bin/editions/tiddlywiki/build.sh "$@" || exit 1

# done
exit 0
