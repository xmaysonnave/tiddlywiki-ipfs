#!/usr/bin/env zsh
echo '*** publish empty ***'

./bin/cli-publish.sh \
  --dir=editions/empty || exit 1

# done
exit 0
