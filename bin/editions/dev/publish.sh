#!/usr/bin/env zsh
echo '***'
echo '*** publish dev ***'
echo '***'

./bin/cli-publish.sh \
  --dir=editions/dev || exit 1

# done
exit 0
