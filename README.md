## ```Ipfs with TiddyWiki```
<a name="ipfs-with-tiddlywiki"/>

```Ipfs with TiddyWiki``` is a [TiddlyWiki](https://tiddlywiki.com/) plugin who aims to help users, editors and developers to save their wikis and attachments over [Ipfs](https://ipfs.io).

This plugin provides the following features:

* Persist over Ipfs saved `TiddlyWiki's` and file attachments
* Publish Ipns Names when `TiddlyWiki's` are saved
* Interact with Ethereum wallets [Metamask](https://metamask.io) or [Frame](https://frame.sh)
* Publish [Ens Domain Resolver content](https://app.ens.domains) over [Ethereum](https://www.ethereum.org)

According to [TiddlyWiki Wikipedia](https://en.wikipedia.org/wiki/TiddlyWiki):

`TiddlyWiki is a personal wiki and a non-linear notebook for organising and sharing complex information. It is an open-source single page application wiki in the form of a single HTML file that includes CSS, JavaScript, and the content. It is designed to be easy to customize and re-shape depending on application. It facilitates re-use of content by dividing it into small pieces called Tiddlers.`

```Ipfs with TiddlyWiki``` is a decentralized application (Đapps) who uses distributed computing systems:

* [Ipfs](https://ipfs.io) is a decentralized storage network
* [Ethereum Smart Contracts](https://ethereum.org/learn/#smart-contracts) are decentralized applications

```Ipfs with TiddlyWiki``` has the following (Đapps) characteristics:

* Open Source
* Privacy
* Unstoppable
* Transparency

## Using ```Ipfs with TiddlyWiki```:
<a name="using-ipfs-with-tiddlywiki"/>

* With a capable Ens browser:
* * [Ipfs with TiddlyWiki](https://bluelightav.eth) on "Mainnet: Ethereum Main Network"
* * [Ipfs with TiddlyWiki Development](https://bluelightav.eth) on "Ropsten (PoW) or Rinkeby (PoA): Ethereum Test Network"
* * [Ipfs with TiddlyWiki Plugin](https://bluelightav.eth/#%24%3A%2Fplugins%2Fipfs)
* * [Ipfs with TiddlyWiki Documentation](https://bluelightav.eth/#Documentation)

* With a non capable Ens browser:
* * [Ipfs with TiddlyWiki](https://bluelightav.eth.link)
* * [Ipfs with TiddlyWiki Documentation](https://bluelightav.eth.link/#Documentation)

### Getting Started
<a name="getting-started"/>

These instructions will get you a copy of the project up and running on your local machine.

### Prerequisites
<a name="pre-requisites"/>

### Users
<a name="users"/>

#### Getting running ```Ipfs with TiddlyWiki``` in your browser
<a name="running-browser"/>

Starting from the file system, Follow the developer instructions [Running TiddlyWiki](#developer-running)

* To resolve https://bluelightav.eth you need an Ens browser:
* * [Metamask](https://metamask.io)

* To use Ens you need an Ethereum wallet:
* * [Metamask](https://metamask.io)
* * [Frame](https://frame.sh)

* To run a local Ipfs node, install:
* * [Ipfs Companion](https://ipfs-shipyard.github.io/ipfs-companion/)
* * [Ipfs Desktop](https://github.com/ipfs-shipyard/ipfs-desktop)

Remarks:

[EthDNS and EthLink](https://eth.link) take care of https://bluelightav.eth.link.

https://bluelightav.eth.link requires [Ipfs Companion](https://ipfs-shipyard.github.io/ipfs-companion) to be fully resolved as an Ipns identifier.

If you don't need or don't want to interact with Ens or install [Ipfs Companion](https://ipfs-shipyard.github.io/ipfs-companion/) https://bluelightav.eth.link is enough to interact with Ipfs.

#### Run a local Ipfs node with Ipfs Desktop
<a name="ipfs-desktop"/>

* [Ipfs Desktop](https://github.com/ipfs-shipyard/ipfs-desktop)

According to the `ipfs-desktop` [README.md](https://github.com/ipfs-shipyard/ipfs-desktop/blob/master/README.md), `IPFS Desktop allows you to run your IPFS Node on your machine without having to bother with command line tools`.

#### Use a browser extension with Ipfs Companion
<a name="ipfs-companion"/>

* [Ipfs Companion for Chrome](https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch)
* [Ipfs Companion for Firefox](https://addons.mozilla.org/fr/firefox/addon/ipfs-companion/)

According to the `ipfs-companion` [README.md](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/README.md), `This add-on enables everyone to access IPFS resources the way they were meant: from locally running IPFS node :-)`.

#### Supported Ens Ethereum Networks
<a name="ens-ethereum-network"/>

* 'Mainnet': Ethereum Main Network
* 'Ropsten': Ethereum Test Network (PoW)
* 'Rinkeby': Ethereum Test Network (PoA)
* 'Goerli': Ethereum Test Network (PoA)

## Developer
<a name="developer"/>

We setup a nodejs environment to build a tiddlywiki instance bundled with ```Ipfs with TiddlyWiki```.

### Environment
<a name="developer-environment"/>

* [Node.js](#nodejs) - Node.js® is a JavaScript runtime built on Chrome's V8 JavaScript engine.
* [Babelify](https://www.npmjs.com/package/babelify) - Babel browserify is a tool for compiling node-flavored commonjs modules for the browser.
* [TiddyWiki5](https://www.npmjs.com/package/tiddlywiki) -  TiddlyWiki, a non-linear personal web self-contained notebook.
* [Ipfs Provider](https://github.com/xmaysonnave/ipfs-provider) - forked from [ipfs-shipyard/ipfs-provider](https://github.com/ipfs-shipyard/ipfs-provider)
* [Ipfs Http Client](https://github.com/ipfs/js-ipfs-http-client)

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

Follow the [nvm installation tutorial](https://github.com/nvm-sh/nvm#installation-and-update).

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
v10.17.0
```

Install the recommended version.
```
nvm install v10.17.0
```

Check:
```
node -v
v10.17.0
```

We update npm to use the latest:
```
npm install -g npm@latest
npm -v
6.13.1
```

At this stage your global environment should look like this:
```
npm -g ls --depth=0
/home/user/.nvm/versions/node/v10.17.0/lib
└── npm@6.13.1
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

The repository contains several scripts who build TiddWiki instances bundled with `Ipfs with TiddlyWiki`. The [package.json](https://github.com/xmaysonnave/tiddlywiki-ipfs/blob/master/package.json) references several options:

* build-all-dev
* build-all
* build-tiddlywiki-ipfs
* run-browserify
* run-prepare-dev
* run-prepare
* test

Use the `build-all` script to build ```Ipfs with TiddlyWiki``` and the `wiki` directory will contain a runnable wiki:
* favicon.ico
* index.html

#### Running TiddlyWiki
<a name="developer-running"/>

Open `wiki/index.html` file in your favorite browser. The `favicon.ico` is available as a convenience as its content is embedded in the `index.html`.

## Contributing
<a name="contributing"/>

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors
<a name="authors"/>

* **Xavier Maysonnave** - *Initial work* - [Ipfs with TiddlyWiki](https://github.com/xmaysonnave/tiddlywiki-ipfs)

See also the list of [contributors](https://github.com/xmaysonnave/tiddlywiki-ipfs/contributors) who participated in this project.

## License
<a name="license"/>

This project is licensed under the [GPL-3.0-or-later](https://spdx.org/licenses/GPL-3.0-or-later.html) from [SPDX](https://spdx.org/) - see the [LICENSE](LICENSE) file for details.


## Acknowledgments
<a name="acknowledgment"/>

* Hat tip to anyone who support this project
* Inspiration
