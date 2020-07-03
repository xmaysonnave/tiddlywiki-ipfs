#!/usr/bin/zsh
# cleanup
rm -f -R ./eth-sig-util > /dev/null 2>&1
rm -f -R ./loglevel > /dev/null 2>&1
rm -f -R ./tw5-locator > /dev/null 2>&1
rm -f -R ./tw5-relink > /dev/null 2>&1

# loglevel
mkdir loglevel
wget https://cdn.jsdelivr.net/npm/loglevel@1.6.8/lib/loglevel.min.js -P ./loglevel
wget https://raw.githubusercontent.com/pimterry/loglevel/master/LICENSE-MIT -P ./loglevel

# eth-sig-util
git clone https://github.com/xmaysonnave/eth-sig-util --depth 1
cd eth-sig-util
. ~/.nvm/nvm.sh
. ~/.zshrc
nvm use
npm install
npm run browser
cd ..

# tw5-locator
git clone https://github.com/bimlas/tw5-locator
cd tw5-locator
git checkout tags/v2.0.0
cd ..

# tw5-relink
git clone https://github.com/flibbles/tw5-relink
cd tw5-relink
git checkout tags/v1.10.0
cd ..

exit 0
