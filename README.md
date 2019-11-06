# Ipfs with TiddyWiki
<a name="tiddlywiki-ipfs"/>

```Ipfs with TiddyWiki``` is a TiddlyWiki plugin who aims to help developers, editors or users to save their wikis and attachments over Ipfs.

This plugin provides the following feature:

* Persist over Ipfs saved `TiddlyWiki's` and file attachments
* Update Ipns identifier when `TiddlyWiki's` are saved
* Update [Ens domain](https://ens.domains/) over [Ethereum](https://www.ethereum.org/)

According to [TiddlyWiki Wikipedia](https://en.wikipedia.org/wiki/TiddlyWiki), `TiddlyWiki is a personal wiki and a non-linear notebook for organising and sharing complex information. It is an open-source single page application wiki in the form of a single HTML file that includes CSS, JavaScript, and the content. It is designed to be easy to customize and re-shape depending on application. It facilitates re-use of content by dividing it into small pieces called Tiddlers.`

Ipfs with TiddlyWiki is a decentralized application (DApp) that runs on a distributed computing system.

Drag and drop the current [Ipfs with TiddlyWiki plugin](https://gateway.ipfs.io/ipfs/QmUfJDgJ91qK23cpYiXAbxp3xeGGhGxpVDU91fH5hQa9Ym/#%24%3A%2Fplugins%2Fipfs) with and ENS compatible browserin your current TiddlyWiki instance.

* [Contributing](#contributing)
* [Authors](#authors)
* [License](#license)
* [Acknowledgment](#acknowledgment)

### Getting Started
<a name="getting-started"/>

These instructions will get you a copy of the project up and running on your local machine.


### Prerequisites
<a name="pre-requisites"/>

* [Users](#users)
* * [Getting running `Ipfs with TiddlyWiki` in your browser](#running-browser)
* * [Running a local Ipfs node with Ipfs Desktop](#ipfs-desktop)
* * [Use a browser extension with Ipfs Companion](#ipfs-companion)
* * [Markdown](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet)
* [Developer](#developer)
* * [Environment](#developer-environment)
* * [Node.js](#developer-nodejs)
* * [Building](#developer-building-tiddlywiki)

### Users
<a name="users"/>


#### Getting running `Ipfs with TiddlyWiki` in your browser
<a name="running-browser"/>

* Starting from the file system, Follow the developer instructions [Running TiddlyWiki](#developer-running)
* Starting with the latest online version @ https://bluelightav.eth
* * [Metamask for Chrome](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn)
* * [Metamask for Firefox](https://addons.mozilla.org/fr/firefox/addon/ether-metamask/)
* Starting with the latest online version @ https://bluelightav.eth.link
* * [Ipfs Companion for Chrome](https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch)
* * [Ipfs Companion for Firefox](https://addons.mozilla.org/fr/firefox/addon/ipfs-companion/)

<b>Remarks:</b>
<br/>
* The https://tiddly.bluelightav.eth.link Url requires Ipfs Companion to be fully resolved as an Ipns indentifier otherwise [EthDNS and EthLink](https://eth.link/) is taking care of your Url. EthLink do not resolve well the https://tiddly.bluelightav.eth.link Url as browsers complain about the Https certificate. This Let's Encrypt valid certificate is a wildcard certificate but too widely opened and considered insecure by major browsers (Tested with Chrome and Firefox). The http://tiddly.bluelightav.eth.link is also available however MITM are possible.
* The https://bluelightav.eth.link Url requires requires Ipfs Companion to be fully resolved as an Ipns identifier otherwise [EthDNS and EthLink](https://eth.link/) is taking care of your Url. In that situation browsers do not complain. The http://bluelightav.eth.link is also available however MITM are possible.
* The https://bluelightav.eth Url requires Metamask to be fully resolved as an Ipfs identifier.


#### Running a local Ipfs node with Ipfs Desktop
<a name="ipfs-desktop"/>

* [Ipfs Desktop](https://github.com/ipfs-shipyard/ipfs-desktop)

According to the `ipfs-desktop` [README.md](https://github.com/ipfs-shipyard/ipfs-desktop/blob/master/README.md), `IPFS Desktop allows you to run your IPFS Node on your machine without having to bother with command line tools`.

Running a local IPFS node server greatly enhance the performance.

#### Use a browser extension with Ipfs Companion
<a name="ipfs-companion"/>

* [Ipfs Companion for Chrome](https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch)
* [Ipfs Companion for Firefox](https://addons.mozilla.org/fr/firefox/addon/ipfs-companion/)

According to the `ipfs-companion` [README.md](https://github.com/ipfs-shipyard/ipfs-companion/blob/master/README.md), `This add-on enables everyone to access IPFS resources the way they were meant: from locally running IPFS node :-)`.


## Developer
<a name="developer"/>

We setup a nodejs environment to build a tiddlywiki instance bundled with `Ipfs with TiddlyWiki`.

### Environment
<a name="developer-environment"/>

* [Node.js](#nodejs) - Node.js® is a JavaScript runtime built on Chrome's V8 JavaScript engine.
* [Babelify](https://www.npmjs.com/package/babelify) - Babel browserify is a tool for compiling node-flavored commonjs modules for the browser.
* [TiddyWiki](https://www.npmjs.com/package/tiddlywiki) -  TiddlyWiki, a non-linear personal web self-contained notebook.
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
v10.16.3
```

Install the recommended version.
```
nvm install v10.16.3
```

Check:
```
node -v
v10.16.3
```

We update npm to use the latest:
```
npm install -g npm@latest
npm -v
6.12.0
```

At this stage your global environment should look like this:
```
npm -g ls --depth=0
/home/user/.nvm/versions/node/v10.16.3/lib
└── npm@6.12.0
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
We now have a populated node_modules directory.


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

Use the `build-all` script to build an Ipfs with TiddlyWiki instances. The `wiki` directory will be populated:
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

* **Xavier Maysonnave** - *Initial work* - [tiddlywiki-ipfs](https://github.com/xmaysonnave/tiddlywiki-ipfs)

See also the list of [contributors](https://github.com/xmaysonnave/tiddlywiki-ipfs/contributors) who participated in this project.


## License
<a name="license"/>

This project is licensed under the [GPL-3.0-or-later](https://spdx.org/licenses/GPL-3.0-or-later.html) from [SPDX](https://spdx.org/) - see the [LICENSE](LICENSE) file for details.


## Acknowledgments
<a name="acknowledgment"/>

* Hat tip to anyone who support this project
* Inspiration
