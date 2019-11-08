/*\
title: $:/plugins/ipfs/ens-library.js
type: application/javascript
module-type: library

EnsLibrary

\*/

import contentHash  from "content-hash";

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
	return await $tw.utils.loadLibrary(
		"EtherJsLibrary",
		"https://unpkg.com/ethers@4.0.39/dist/ethers.js",
		"sha384-8OdAmOJEwe+QixxnkPcSZxfA4cONi9uVFkkOYDWlA4cUaAWCP0RocfXcltWlo9gl",
		true
	);
}

EnsLibrary.prototype.loadWeb3Library = async function() {
	// https://github.com/ethers-io/ethers.js/
	return await $tw.utils.loadLibrary(
		"Web3Library",
		"https://unpkg.com/web3@1.2.2/dist/web3.js",
		"sha384-0MdOndRhW+SsaO8Ki2fauck7Zg1hULyO2e8ioobeVOW69F/1rmpaIvQLPz7KMR8w"
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

EnsLibrary.prototype.enableMetamask = async function() {
	// Check if Metamask is available
	if (window.ethereum == undefined) {
		throw new Error("Non-ENS browser detected. You should consider installing MetaMask...");
	}
	// Enable Metamask
	let accounts;
	try {
		accounts = await window.ethereum.enable();
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to enable Metamask...");
	}
	// Return current owner
	return accounts[0];
}

EnsLibrary.prototype.getWeb3 = async function() {
	// EnableMetamask
	await this.enableMetamask();
	// web3
	if (this.web3 == undefined) {
		if (window.ethers == undefined) {
			await this.loadEtherJsLibrary();
		}
		this.web3 = new window.ethers.providers.Web3Provider(window.ethereum);
	}
	return this.web3;
}

EnsLibrary.prototype.getEns = async function() {
	// Retrieve Signer
	const web3 = await this.getWeb3();
	const network = await web3.getNetwork();
	const networkId = network.chainId;
	const signer = web3.getSigner();
	// Ethereum Ens Registry
	var ensNetwork;
	try {
		ensNetwork = this.contracts[networkId];
	} catch (error) {
		console.log(error.message);
		throw new Error("Unsupported Ethereum network...");
	}
	if ($tw.utils.getIpfsVerbose()) console.log(ensNetwork.name);
	// Load Ens contract
	if (this.ens == undefined) {
		try {
			// https://github.com/ensdomains/ui/blob/master/src/ens.js
			const ens = JSON.parse($tw.wiki.getTiddler("$:/ipfs/saver/contract/ens").fields.text);
			this.ens = new window.ethers.Contract(ensNetwork.registry, ens.abi, signer);
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to fetch Ens registry...");
		}
	}
	return this.ens;
}

EnsLibrary.prototype.getResolver = async function(resolverAddress) {
	if (resolverAddress == undefined || /^0x0+$/.test(resolverAddress) == true) {
		throw new Error("Undefined Ens domain resolver...");
	}
	// Retrieve Signer
	const web3 = await this.getWeb3();
	const signer = web3.getSigner();
	// Load Resolver contract
	if (this.resolver == undefined) {
		try {
			// Mainnet Resolver address
			const resolver = JSON.parse($tw.wiki.getTiddler("$:/ipfs/saver/contract/resolver").fields.text);
			this.resolver = new window.ethers.Contract(resolverAddress, resolver.abi, signer);
		} catch (error) {
			console.log(error.message);
			throw new Error("Unable to fetch Ens resolver...");
		}
	}
	return this.resolver;
}

EnsLibrary.prototype.getContenthash = async function(domain) {
	if (domain == undefined || domain == null || domain.trim() === "") {
		throw new Error("Undefined Ens domain...");
	}
	// Fetch Resolver
	if (window.ethers == undefined) {
		await this.loadEtherJsLibrary();
	}
	const namehash = window.ethers.utils.namehash(domain);
	var resolver;
	try {
		const ens = await this.getEns();
		resolver = await ens.resolver(namehash);
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to get Ens domain resolver...");
	}
	// Check
	if (resolver == undefined || /^0x0+$/.test(resolver) == true) {
		throw new Error("Undefined Ens domain resolver...");
	}
	if ($tw.utils.getIpfsVerbose()) console.log("Fetched Ens domain resolver: " + resolver);
	// Load Contenthash
	var content;
	try {
		resolver = await this.getResolver(resolver);
		if ($tw.utils.getIpfsVerbose()) console.log("Processing Ens get content hash...");
		content = await resolver.contenthash(namehash);
		if ($tw.utils.getIpfsVerbose()) console.log("Processed Ens get content hash...");
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to fetch Ens domain content hash...");
	}
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
	// Fetch Resolver
	if (window.ethers == undefined) {
		await this.loadEtherJsLibrary();
	}
	const namehash = window.ethers.utils.namehash(domain);
	const encoded = await this.encodeContenthash("ipfs://" + cid);
	var resolver;
	try {
		const ens = await this.getEns();
		resolver = await ens.resolver(namehash);
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to get Ens domain resolver...");
	}
	// Exist
	if (resolver == undefined || /^0x0+$/.test(resolver) == true) {
		throw new Error("Undefined Ens domain resolver...");
	}
	if ($tw.utils.getIpfsVerbose()) console.log("Fetched Ens domain resolver: " + resolver);
	// Set Contenthash
	try {
		resolver = await this.getResolver(resolver);
		if ($tw.utils.getIpfsVerbose()) console.log("Processing Ens set content hash...");
		var tx = await resolver.setContenthash(namehash, encoded);
		if ($tw.utils.getIpfsVerbose()) console.log("Processing Transaction: " + tx.hash);
		// Wait for transaction completion
		await tx.wait();
		if ($tw.utils.getIpfsVerbose()) console.log("Processed Ens set content hash...");
	} catch (error) {
		console.log(error.message);
		throw new Error("Unable to set Ens domain content hash...");
	}
	return;
}

exports.EnsLibrary = EnsLibrary;

})();
