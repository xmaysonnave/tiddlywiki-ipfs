#!/usr/bin/env bash

# cleanup
rm -f -R ./tw5-locator > /dev/null 2>&1
rm -f -R ./tw5-relink > /dev/null 2>&1

# tw5-locator
git clone https://github.com/bimlas/tw5-locator
cd tw5-locator
git checkout tags/v2.0.1
cd ..

# tw5-relink
git clone https://github.com/flibbles/tw5-relink
cd tw5-relink
git checkout tags/v1.10.0
cd ..

exit 0
