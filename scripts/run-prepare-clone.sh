#!/bin/bash
# cleanup
rm -f -R ./tw5-locator > /dev/null 2>&1
# tw5-locator
git clone https://github.com/bimlas/tw5-locator
cd tw5-locator
git checkout tags/v1.5.0 > /dev/null 2>&1
cd ..

exit 0