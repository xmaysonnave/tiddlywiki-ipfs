# Ipfs with TiddyWiki
<a name="tiddlywiki-ipfs"/>
`Ipfs with TiddyWiki` is a TiddlyWiki plugin who aims to help developers, editors or users to save their wikis and attachments over Ipfs.

### Getting Started
<a name="getting-started"/>
These instructions will get you a copy of the project up and running on your local machine.


### Prerequisites
<a name="pre-requisites"/>

* [Users](#users)
* * [Getting running `Ipfs with TiddlyWiki` in your browser](#running-browser)
* * [Running a local Ipfs node with Ipfs Desktop](#ipfs-desktop)
* * [Markdown](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet)
* [Developer](#developer)
* * [Environment](#developer-environment)
* * [Node.js](#developer-nodejs)
* * [Building](#developer-building)
* * Running a local Ipfs server go-ipfs
* * Running a Https Nginx frontend
* [License](#license)

### Users
<a name="users"/>


#### Getting running `Ipfs with TiddlyWiki` in your browser
<a name="running-browser"/>


#### Running a local Ipfs node with Ipfs Desktop
<a name="ipfs-desktop"/>


## Developer
<a name="developer"/>
We setup a nodejs environment to build a tiddlywiki instance bundled with `Ipfs with TiddlyWiki`.

### Environment
<a name="developer-environment"/>
* [Node.js](#nodejs) - Node.js® is a JavaScript runtime built on Chrome's V8 JavaScript engine.
* [Babelify](https://www.npmjs.com/package/babelify) - Babel browserify is a tool for compiling node-flavored commonjs modules for the browser.
* [TiddyWiki](https://www.npmjs.com/package/tiddlywiki) -  TiddlyWiki, a non-linear personal web self-contained notebook.
* [Ipfs Provider](https://github.com/ipfs-shipyard/ipfs-provider)
* [Ipfs Http Client](https://github.com/ipfs/js-ipfs-http-client)
* [Ipfs Companion for Chrome](https://chrome.google.com/webstore/detail/ipfs-companion/nibjojkomfdiaoajekhjakgkdhaomnch)
* [Ipfs Companion for Firefox](https://addons.mozilla.org/fr/firefox/addon/ipfs-companion/)
* [Go](https://golang.org/) - go version 1.12.X recommended
* [Go Ipfs](https://github.com/ipfs/go-ipfs)
* [Nginx](http://nginx.org/)


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
On Debian buster we setup a new source list who contains the node 11.x repository addresses.
edit:
```
/etc/apt/source.list.d/nodesource.list
```
input:
```
deb https://deb.nodesource.com/node_11.x buster main
deb-src https://deb.nodesource.com/node_11.x buster main
```

Once our node repository is known, we update and install the latest nodejs 11.x.
```
sudo apt update
sudo apt install nodejs
```


##### Setup
<a name="developer-nodejs-setup"/>
We configure our home environment to host the npm global packages.

Configure npm global directory
```
// directory where npm will install packages
mkdir ~/.npm-global
// configure npm
npm config set prefix '~/.npm-global'

// following the previous command ~/.npmrc should contain:
prefix=/home/yourHome/.npm-global

// update .profile or .zshrc with
export PATH=~/.npm-global/bin:$PATH

// update your system variables
source ~/.profile or source ~/.zshrc
```

At this stage we can test our node environment:
```
node -v
v11.15.0
```

We update npm to use the latest:
```
npm install -g npm@latest
```
Then we test our npm environment:
```
npm -v
6.11.3
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
The repository contains several scripts who build TiddWiki instances bundled with `Ipfs with TiddlyWiki`.
The [package.json](https://github.com/xmaysonnave/tiddlywiki-ipfs/blob/master/package.json) references several options:
* prepare
* browserify
* tiddlywiki-ipfs
* tiddlywiki-ipfs-cardo
* all
Use the `all` script to build TiddlyWiki instances.
The `ipfs/output` directory should be populated with two directories:
* base
* cardo

#### Running TiddlyWiki
<a name="developer-running"/>
The directory `ipfs/output/base` contains two files:
* favicon.ico
* index.html
Open the index.html in your favorite browser.
The `favicon.ico` is available as a convenience as its content is embedded in the `index.html`.

## Contributing
<a name="contributing"/>

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

<a name="authors"/>## Authors

* **Xavier Maysonnave** - *Initial work* - [tiddlywiki-ipfs](https://github.com/xmaysonnave/tiddlywiki-ipfs)

See also the list of [contributors](https://github.com/xmaysonnave/tiddlywiki-ipfs/contributors) who participated in this project.


## License
<a name="license"/>

This project is licensed under the GPLv3 License - see the [LICENSE.md](LICENSE.md) file for details


## Acknowledgments
<a name="acknowledgment"/>

* Hat tip to anyone who support this project
* Inspiration
