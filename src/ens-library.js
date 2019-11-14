/*\
title: $:/plugins/ipfs/ens-library.js
type: application/javascript
module-type: library

EnsLibrary

\*/

import contentHash from "content-hash";

( function() {

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

/*
Ens Library
*/
var EnsLibrary = function() {
	// https://github.com/ensdomains/ui/blob/master/src/ens.js
	this.contracts = {
		1: {
			registry: "0x314159265dd8dbb310642f98f50c066173c1259b",
			name: "Mainnet : Ethereum main network"
		},
		3: {
			registry: "0x112234455c3a32fd11230c42e7bccd4a84e02010",
			name: "Ropsten : Ethereum test network (PoW)"
		},
		4: {
			registry: "0xe7410170f87102df0055eb195163a03b7f2bff4a",
			name: "Rinkeby : Ethereum test network (PoA)"
		},
		5: {
			registry: "0x112234455c3a32fd11230c42e7bccd4a84e02010",
			name: "Goerli : Ethereum test network (PoA)"
		}
	};
};

// https://www.srihash.org/
EnsLibrary.prototype.loadEtherJsLibrary = async function() {
	// https://github.com/ethers-io/ethers.js/
	await $tw.utils.loadLibrary(
		"EthersLibrary",
		"https://cdn.jsdelivr.net/npm/ethers@4.0.39/dist/ethers.min.js",
		"sha256-yz1Dxy0deOtTgNuwHqGn5+cEA2ONb+siQ4mXgLIK7QI=",
		true
	);
}

EnsLibrary.prototype.loadWeb3Library = async function() {
	// https://github.com/ethereum/web3.js/
	await $tw.utils.loadLibrary(
		"Web3JsLibrary",
		"https://cdn.jsdelivr.net/npm/web3@1.2.2/dist/web3.min.js",
		"sha256-b97Eq0wEAfrYPDDkqiqkHKTCtkEY4w2VsbcyVHjsmgo="
	);
}

// https://github.com/ensdomains/ui/blob/master/src/utils/contents.js
EnsLibrary.prototype.decodeContenthash = async function(encoded) {
	let decoded, protocol;
  if (encoded.error) {
		throw new Error(encoded.error);
  }
  if (encoded) {
		decoded = contentHash.decode(encoded);
		const codec = contentHash.getCodec(encoded);
		if (codec === "ipfs-ns") {
			protocol = "ipfs";
		} else if (codec === "swarm-ns") {
			protocol = "bzz";
		} else if (codec === "onion") {
			protocol = "onion";
		} else if (codec === "onion3") {
			protocol = "onion3";
		}
  }
  return {
		decoded: decoded,
		protocol: protocol
	};
}

EnsLibrary.prototype.encodeContenthash = async function(text) {
  let content, contentType;
  let encoded = false;
  if (!!text) {
    const matched = text.match(/^(ipfs|bzz|onion|onion3):\/\/(.*)/) || text.match(/\/(ipfs)\/(.*)/);
    if (matched) {
      contentType = matched[1];
      content = matched[2];
    }
		if (contentType === "ipfs") {
			if (content.length >= 4) {
				encoded = "0x" + contentHash.fromIpfs(content);
			}
		} else {
			throw new Error("Unsupported Ens domain protocol: " + contentType);
		}
  }
  return encoded;
}

EnsLibrary.prototype.enableProvider = async function(provider) {
	// Check
	if (provider == undefined || provider == null) {
		throw new Error("Undefined Etheereum provider...");
	}
	// Enable Provider
	var accounts = null;
  if (typeof provider.enable === "function") {
    accounts = await provider.enable();
  } else if (typeof provider.send === "function") {
    accounts = await provider.send("eth_requestAccounts");
	}
	if (accounts == undefined || accounts == null || Array.isArray(accounts) == false || accounts.length == 0) {
		throw new Error("Unable to retrieve an Ethereum account...");
	}
	// Return First account
	return accounts[0];
}

EnsLibrary.prototype.getProvider = function() {
	var provider = null;
	// Check if an Ethereum provider is available
	if (typeof window.ethereum !== "undefined") {
		provider = window.ethereum;
	}
	if (provider == null && window.web3 !== undefined && window.web3.currentProvider !== undefined) {
		provider = window.web3.currentProvider;
	}
	if (provider == null) {
		throw new Error("Unavailable Ethereum provider.\nYou should consider installing Frame or MetaMask...");
	}
	return provider;
}

EnsLibrary.prototype.getWeb3Provider = async function() {
	// Load Web3 if applicable
	if (typeof window.Web3 === "undefined") {
		await this.loadWeb3Library();
	}
	// Retrieve the current provider
	const provider = this.getProvider();
	// Instantiate Web3 to retrieve its api version and provider name
	const web3 = new window.Web3(provider);
	// Current api info
	if (typeof web3.version.api !== "undefined") {
		if ($tw.utils.getIpfsVerbose()) console.log("Web3 Api version: " + web3.version.api);
	} else {
		if ($tw.utils.getIpfsVerbose()) console.log("Web3 Api version: " + web3.version);
	}
	// Current provider info if any
	if (typeof web3.eth !== "undefined" && typeof web3.eth.getNodeInfo === "function") {
		const info = await web3.eth.getNodeInfo(); // Frame or Metamask
		if ($tw.utils.getIpfsVerbose()) console.log("Ethereum provider: " + info);
	}
	// Instantiate Web3Provider
	const web3Provider = new window.ethers.providers.Web3Provider(provider);
	return web3Provider;
}

EnsLibrary.prototype.getEns = async function(web3Provider) {
	if (web3Provider == undefined || web3Provider == null) {
		throw new Error("Undefined web3...");
	}
	var networkId = null;
	if (typeof web3Provider.eth !== "undefined" && typeof web3Provider.eth.net !== "undefined" && typeof web3Provider.eth.net.getId === "function") {
		networkId = await web3Provider.eth.net.getId();
	} else {
		const network = await web3Provider.getNetwork();
		networkId = network.chainId;
	}
	// Ethereum Ens Registry
	var network;
	try {
		network = this.contracts[networkId];
	} catch (error) {
		console.log(error.message);
		throw new Error("Unsupported Ethereum network: " + networkId);
	}
	if ($tw.utils.getIpfsVerbose()) console.log(network.name);
	// Load ethers
	if (typeof window.ethers === "undefined") {
		await this.loadEtherJsLibrary();
	}
	// https://github.com/ensdomains/ui/blob/master/src/ens.js
	const contract = JSON.parse($tw.wiki.getTiddler("$:/ipfs/saver/contract/ens").fields.text);
	const ens = new window.ethers.Contract(network.registry, contract.abi, web3Provider.getSigner());
	// Return web3 instance and ens contract
	return ens;
}

EnsLibrary.prototype.getResolver = async function(resolverAddress, web3Provider) {
	// Check
	if (resolverAddress == undefined || resolverAddress == null || /^0x0+$/.test(resolverAddress) == true) {
		throw new Error("Undefined Ens domain resolver address...");
	}
	if (web3Provider == undefined || web3Provider == null) {
		throw new Error("Undefined Ethereum provider...");
	}
	// Load ethers
	if (typeof window.ethers === "undefined") {
		await this.loadEtherJsLibrary();
	}
	// https://github.com/ensdomains/ui/blob/master/src/ens.js
	const contract = JSON.parse($tw.wiki.getTiddler("$:/ipfs/saver/contract/resolver").fields.text);
	const resolver = new window.ethers.Contract(resolverAddress, contract.abi, web3Provider.getSigner());
	return resolver;
}

EnsLibrary.prototype.getContenthash = async function(domain) {
	if (domain == undefined || domain == null || domain.trim() === "") {
		throw new Error("Undefined Ens domain...");
	}
	// Load ethers
	if (typeof window.ethers === "undefined") {
		await this.loadEtherJsLibrary();
	}
	// Retrieve the current provider
	const provider = this.getProvider();
	// Getting web3 provider
	const web3Provider = await this.getWeb3Provider();
	// Resolve domain as namehash
	const namehash = window.ethers.utils.namehash(domain);
	// Load Ens registry
	const ens = await this.getEns(web3Provider);
	// Enable provider
	const account = await this.enableProvider(provider);
	if ($tw.utils.getIpfsVerbose()) console.log("Selected account: " + account);
	// Fetch resolver address
	const resolverAddress = await ens.resolver(namehash);
	// Check
	if (resolverAddress == null || /^0x0+$/.test(resolverAddress) == true) {
		throw new Error("Undefined Ens domain resolver...");
	}
	if ($tw.utils.getIpfsVerbose()) console.log("Fetched Ens domain resolver address: " + resolverAddress);
	// Load Contenthash
	const resolver = await this.getResolver(resolverAddress, web3Provider);
	if ($tw.utils.getIpfsVerbose()) console.log("Processing Ens get content hash...");
	const content = await resolver.contenthash(namehash);
	if ($tw.utils.getIpfsVerbose()) console.log("Processed Ens get content hash...");
	const decoded = await this.decodeContenthash(content);
	return decoded;
}

EnsLibrary.prototype.setContenthash = async function(domain, cid) {
	if (domain == undefined || domain == null || domain.trim() === "") {
		throw new Error("Undefined Ens domain...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}
	// Load ethers
	if (typeof window.ethers === "undefined") {
		await this.loadEtherJsLibrary();
	}
	// Retrieve the current provider
	const provider = this.getProvider();
	// Getting web3 provider
	const web3Provider = await this.getWeb3Provider();
	// Resolve domain as namehash
	const namehash = window.ethers.utils.namehash(domain);
	// Encode cid
	const encoded = await this.encodeContenthash("ipfs://" + cid);
	// Load Ens registry
	const ens = await this.getEns(web3Provider);
	// Enable provider
	const account = await this.enableProvider(provider);
	if ($tw.utils.getIpfsVerbose()) console.log("Selected account: " + account);
	// Fetch resolver address
	const resolverAddress = await ens.resolver(namehash);
	// Exist
	if (resolverAddress == null || /^0x0+$/.test(resolverAddress) == true) {
		throw new Error("Undefined Ens domain resolver address...");
	}
	if ($tw.utils.getIpfsVerbose()) console.log("Fetched Ens domain resolver address: " + resolverAddress);
	// Set Contenthash
	const resolver = await this.getResolver(resolverAddress, web3Provider);
	if ($tw.utils.getIpfsVerbose()) console.log("Processing Ens set content...");
	var tx = await resolver.setContenthash(namehash, encoded);
	if ($tw.utils.getIpfsVerbose()) console.log("Processing Transaction: " + tx.hash);
	// Wait for transaction completion
	await tx.wait();
	if ($tw.utils.getIpfsVerbose()) console.log("Processed Ens set content...");
}

exports.EnsLibrary = EnsLibrary;

})();
