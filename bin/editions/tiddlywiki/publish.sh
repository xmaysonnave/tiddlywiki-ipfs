#!/usr/bin/env zsh
echo '***'
echo '*** publish tiddlywiki ***'
echo '***'

./bin/cli-publish.sh \
  --dir=editions/tiddlywiki || exit 1

# done
exit 0
