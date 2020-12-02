#!/usr/bin/env zsh
echo '*** publish tiddlywiki ***'

./bin/cli-publish.sh \
  --dir=editions/tiddlywiki || exit 1

# done
exit 0
