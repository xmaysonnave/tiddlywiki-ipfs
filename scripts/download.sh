#!/usr/bin/env zsh
echo '*** download ***'

# cleanup
rm -f -R ./download > /dev/null 2>&1
# layout
mkdir ./download > /dev/null 2>&1

# down
cd download

# @metamask/detect-provider
mkdir detect-provider > /dev/null 2>&1
wget https://cdn.jsdelivr.net/npm/@metamask/detect-provider@1.2.0/dist/detect-provider.min.js -O ./detect-provider/detect-provider.min.js

# loglevel
mkdir loglevel > /dev/null 2>&1
wget https://cdn.jsdelivr.net/npm/loglevel@1.7.0/dist/loglevel.min.js -O ./loglevel/loglevel.min.js

# pako
mkdir pako > /dev/null 2>&1
wget https://cdn.jsdelivr.net/npm/pako@2.0.2/dist/pako.min.js -O ./pako/pako.min.js

# tw5-locator
git clone https://github.com/bimlas/tw5-locator
cd tw5-locator
git checkout tags/v2.0.1
cd ..

# tw5-relink
git clone https://github.com/flibbles/tw5-relink
cd tw5-relink
git checkout tags/v1.10.1
cd ..

#up
cd ..

# done
exit 0
