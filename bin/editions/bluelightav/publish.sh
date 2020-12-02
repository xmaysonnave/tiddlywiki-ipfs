#!/usr/bin/env zsh
echo '***'
echo '*** publish bluelightav ***'
echo '***'

./bin/cli-publish.sh \
  --dir=editions/bluelightav || exit 1

# done
exit 0
