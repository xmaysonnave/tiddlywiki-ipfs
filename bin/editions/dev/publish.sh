#!/usr/bin/env zsh
echo '*** publish dev ***'

./bin/cli-publish.sh \
  --dir=editions/dev || exit 1

# done
exit 0
