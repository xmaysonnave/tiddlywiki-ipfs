#!/usr/bin/env zsh
echo '***'
echo '*** publish empty ***'
echo '***'

./bin/cli-publish.sh \
  --dir=editions/empty || exit 1

# done
exit 0
