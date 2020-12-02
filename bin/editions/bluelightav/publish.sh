#!/usr/bin/env zsh
echo '*** publish bluelightav ***'

./bin/cli-publish.sh \
  --dir=editions/bluelightav || exit 1

# done
exit 0
