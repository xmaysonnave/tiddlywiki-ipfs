## ```IPFS with TiddyWiki```
<a name="ipfs-with-tiddlywiki"/>

```IPFS with TiddyWiki``` is a [TiddlyWiki](https://tiddlywiki.com/) plugin who aims to help users, editors and developers to save their wikis and attachments over [IPFS](https://ipfs.io).

This plugin provides the following features:

* Persist over [IPFS](https://ipfs.io/) saved `TiddlyWiki's` and file attachments
* Publish IPNS Names when `TiddlyWiki's` are saved
* Interact with Ethereum wallets [Metamask](https://metamask.io) or [Frame](https://frame.sh)
* Publish to [ENS](https://ens.domains)

According to [TiddlyWiki Wikipedia](https://en.wikipedia.org/wiki/TiddlyWiki):

`TiddlyWiki is a personal wiki and a non-linear notebook for organising and sharing complex information. It is an open-source single page application wiki in the form of a single HTML file that includes CSS, JavaScript, and the content. It is designed to be easy to customize and re-shape depending on application. It facilitates re-use of content by dividing it into small pieces called Tiddlers.`

```IPFS with TiddlyWiki``` is a decentralized application (Đapps) who uses distributed computing systems:

* [IPFS](https://ipfs.io) is a decentralized storage network
* [Ethereum Smart Contracts](https://ethereum.org/learn/#smart-contracts) are decentralized applications

```IPFS with TiddlyWiki``` has the following (ĐApp) characteristics:

* Open Source
* Privacy
* Unstoppable
* Transparency

## Using ```IPFS with TiddlyWiki```:
<a name="using-ipfs-with-tiddlywiki"/>

* With a capable [ENS](https://ens.domains/) browser:
* * [IPFS with TiddlyWiki](https://bluelightav.eth)
* * [IPFS with TiddlyWiki Plugin](https://bluelightav.eth/#%24%3A%2Fplugins%2Fipfs)
* * [IPFS with TiddlyWiki Documentation](https://bluelightav.eth/#IPFS%20Documentation)

* With a non capable [ENS](https://ens.domains/) browser:
* * [IPFS with TiddlyWiki](https://bluelightav.eth.link)
* * [IPFS with TiddlyWiki Plugin](https://bluelightav.eth.link/#%24%3A%2Fplugins%2Fipfs)
* * [IPFS with TiddlyWiki Documentation](https://bluelightav.eth.link/#IPFS%20Documentation)

* Recommended TiddlyWiki Plugins:
* * [TiddlyWiki Locator Plugin](https://bimlas.gitlab.io/tw5-locator/#%24%3A%2Fplugins%2Fbimlas%2Flocator)
* * [TiddlyWiki Relink](https://flibbles.github.io/tw5-relink/)

### Getting Started
<a name="getting-started"/>

These instructions will get you a copy of the project up and running on your local machine.

### Prerequisites
<a name="pre-requisites"/>

### Users
<a name="users"/>

#### Getting running ```IPFS with TiddlyWiki``` in your browser
<a name="running-browser"/>

Starting from the file system, Follow the developer instructions [Running TiddlyWiki](#developer-running)

* To resolve https://bluelightav.eth you need an [ENS](https://ens.domains/) browser:
* * [Metamask](https://metamask.io)

* To use [ENS](https://ens.domains/) you need an Ethereum wallet:
* * [Metamask](https://metamask.io)
* * [Frame](https://frame.sh)

* To run a local IPFS node, install:
* * [IPFS Companion](https://ipfs-shipyard.github.io/ipfs-companion/)
* * [IPFS Desktop](https://github.com/ipfs-shipyard/ipfs-desktop)

Remarks:

[EthDNS and EthLink](https://eth.link) take care of https://bluelightav.eth.link.

https://bluelightav.eth.link requires [IPFS Companion](https://ipfs-shipyard.github.io/ipfs-companion) to be fully resolved as an IPNS identifier.

If you don't need or don't want to interact with [ENS](https://ens.domains/) or install [IPFS Companion](https://ipfs-shipyard.github.io/ipfs-companion/) https://bluelightav.eth.link is enough to interact with IPFS.

#### Run a local IPFS node with IPFS Desktop
<a name="ipfs-desktop"/>

* [IPFS Desktop](https://github.com/ipfs-shipyard/ipfs-desktop)

According to the `ipfs-desktop` [README.md](https://github.com/ipfs-shipyard/ipfs-desktop/blob/master/README.md), `IPFS Desktop allows you to run your IPFS Node on your machine without having to bother with command line tools`.

#### Use a browser extension with IPFS Companion
<a name="ipfs-companion"/>

* [IPFS Companion for Chrome](https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch)
* [IPFS Companion for Firefox](https://addons.mozilla.org/fr/firefox/addon/ipfs-companion/)

According to the `ipfs-companion` [README.md](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/README.md), `This add-on enables everyone to access IPFS resources the way they were meant: from locally running IPFS node :-)`.

#### Supported ENS Ethereum Networks
<a name="ens-ethereum-network"/>

* 'Mainnet': Ethereum Main Network
* 'Ropsten': Ethereum Test Network (PoW)
* 'Rinkeby': Ethereum Test Network (PoA)
* 'Goerli': Ethereum Test Network (PoA)

## Developer
<a name="developer"/>

We setup a nodejs environment to build a tiddlywiki instance bundled with ```IPFS with TiddlyWiki```.

### Environment
<a name="developer-environment"/>

* [Node.js](#nodejs) - Node.js® is a JavaScript runtime built on Chrome's V8 JavaScript engine.
* [Babelify](https://www.npmjs.com/package/babelify) - Babel browserify is a tool for compiling node-flavored commonjs modules for the browser.
* [TiddyWiki5](https://www.npmjs.com/package/tiddlywiki) -  TiddlyWiki, a non-linear personal web self-contained notebook.
* [IPFS Provider](https://github.com/xmaysonnave/ipfs-provider) - forked from [ipfs-shipyard/ipfs-provider](https://github.com/ipfs-shipyard/ipfs-provider)
* [IPFS Http Client](https://github.com/ipfs/js-ipfs-http-client)

#### Node.js
<a name="developer-nodejs"/>

##### Resource
<a name="developer-nodejs-resource"/>

Official Node documentation:
https://nodejs.org/en/docs/

Official npm repository
https://www.npmjs.com/

##### Install
<a name="developer-nodejs-install"/>

On Debian buster we don't use the default Debian repositories or the Nodesource repositories.
We recommend [nvm](https://github.com/nvm-sh/nvm) for its flexibility.

##### Setup
<a name="developer-nodejs-setup"/>

Follow the [nvm installation and update tutorial](https://github.com/nvm-sh/nvm#installation-and-update):

Current installation and update script:
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
```

As we are using [zsh](https://github.com/robbyrussell/oh-my-zsh/wiki/Installing-ZSH), here is an excerpt of our .zshrc
```
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# place this after nvm initialization!
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    echo "Reverting to nvm default version"
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

This repository contains a [.nvmrc](https://github.com/xmaysonnave/tiddlywiki-ipfs/blob/master/.nvmrc) who describes the node version to use.
```
v12.16.1
```

Install the recommended version.
```
nvm install v12.16.1
```

Check:
```
node -v
v12.16.1
```

We update npm to use the latest:
```
npm install -g npm@latest
npm -v
6.14.2
```

At this stage your global environment should look like this:
```
npm -g ls --depth=0
/home/user/.nvm/versions/node/v10.19.0/lib
└── npm@6.14.2
```

#### Repository install
<a name="developer-repository-install"/>

Clone this repository in a local folder:
```
git clone https://github.com/xmaysonnave/tiddlywiki-ipfs --depth 1
```
Change directory:
```
cd tiddlywiki-ipfs
```
Install dependencies, [Node.js](#nodejs) should be installed and setup:
```
npm install
```

#### Building TiddlyWiki
<a name="developer-building-tiddlywiki"/>

The repository contains several scripts who build TiddWiki instances bundled with `IPFS with TiddlyWiki`.

The [package.json](https://github.com/xmaysonnave/tiddlywiki-ipfs/blob/master/package.json) references several options:

* build-all-noclone
* build-all
* build-tiddlywiki
* pretty-quick
* run-build-number
* run-browserify
* run-prepare-clone
* run-prepare
* test
* test-no-build

Use the `build-all` or `test` scripts to build ```IPFS with TiddlyWiki```.

The `wiki` directory will contain two runnable wikis:

* [index.html](https://htmlpreview.github.io/?https://github.com/xmaysonnave/tiddlywiki-ipfs/blob/master/wiki/index.html)
* [empty.html](https://htmlpreview.github.io/?https://github.com/xmaysonnave/tiddlywiki-ipfs/blob/master/wiki/empty.html)

The `wiki` directory will also contain the plugin as a json file:

* [tiddlywiki-ipfs-plugin.json](https://github.com/xmaysonnave/tiddlywiki-ipfs/blob/master/wiki/tiddlywiki-ipfs-plugin.json)

Use the `test` script to build and run the tests.

This repository is integrated with Travis CI:

* https://travis-ci.com/github/xmaysonnave/tiddlywiki-ipfs

#### Running TiddlyWiki
<a name="developer-running"/>

Open `wiki/index.html` file in your favorite browser.

## Contributing
<a name="contributing"/>

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors
<a name="authors"/>

* **Xavier Maysonnave** - *Initial work* - [IPFS with TiddlyWiki](https://github.com/xmaysonnave/tiddlywiki-ipfs)

See also the list of [contributors](https://github.com/xmaysonnave/tiddlywiki-ipfs/contributors) who participated in this project.

## License
<a name="license"/>

This project is licensed under the [GPL-3.0-or-later](https://spdx.org/licenses/GPL-3.0-or-later.html) - see the [LICENSE](LICENSE) file for details.


## Acknowledgments
<a name="acknowledgment"/>

* Hat tip to anyone who support this project
* Inspiration
