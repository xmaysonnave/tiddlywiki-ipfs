#!/usr/bin/env zsh
# publish empty
./bin/editions/empty/publish.sh "$@" || exit 1

# publish bluelightav.eth
./bin/editions/bluelightav/publish.sh "$@" || exit 1

# publish dev
./bin/editions/dev/publish.sh "$@" || exit 1

# publish tiddlywiki
./bin/editions/tiddlywiki/publish.sh "$@" || exit 1

# done
exit 0
