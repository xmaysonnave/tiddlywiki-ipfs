/*\
title: $:/plugins/ipfs/ens-library.js
type: application/javascript
module-type: library

EnsLibrary

\*/

import contentHash from "content-hash";
import namehash from "eth-ens-namehash";
import abi from "ethereumjs-abi";
import { abi as ensContract } from "@ensdomains/ens/build/contracts/ENS.json";
import { abi as resolverContract } from "@ensdomains/resolver/build/contracts/PublicResolver.json";

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
		"https://cdn.jsdelivr.net/npm/ethers@4.0.39/dist/ethers.js",
		"sha384-8OdAmOJEwe+QixxnkPcSZxfA4cONi9uVFkkOYDWlA4cUaAWCP0RocfXcltWlo9gl",
		true
	);
}

// https://www.srihash.org/
EnsLibrary.prototype.loadWeb3Library = async function() {
	// https://github.com/ethereum/web3.js/
	await $tw.utils.loadLibrary(
		"Web3Library",
		"https://unpkg.com/web3@1.2.2/dist/web3.js",
		"sha384-0MdOndRhW+SsaO8Ki2fauck7Zg1hULyO2e8ioobeVOW69F/1rmpaIvQLPz7KMR8w"
	);
}

EnsLibrary.prototype.encodedMethod = function(name, args, values) {
	// Check
	if (name == undefined || name == null)  {
		throw new Error("Undefined smart contract method name...");
	}
	if (args == undefined || args == null || Array.isArray(args) == false)  {
		throw new Error("Undefined smart contract method arguments...");
	}
	const methodId = abi.methodID(name, args).toString("hex");
	const params = abi.rawEncode(args, values).toString("hex");
	return "0x" + methodId + params;
}

// https://github.com/ensdomains/ui/blob/master/src/utils/contents.js
EnsLibrary.prototype.decodeContenthash = function(encoded) {
	let decoded, protocol;
  if (encoded.error) {
		throw new Error(encoded.error);
  }
  if (encoded) {
		const codec = contentHash.getCodec(encoded);
		decoded = contentHash.decode(encoded);
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

EnsLibrary.prototype.encodeContenthash = function(text) {
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
		throw new Error("Undefined Ethereum provider...");
	}
	// Enable Provider
	var accounts = null;
	// Legacy
	if (typeof provider.enable === "function") {
		accounts = await provider.enable();
	// Handle connecting, per EIP 1102
  } else if (typeof provider.send === "function") {
		try {
			await provider.send("eth_requestAccounts");
		} catch (error) {
			// EIP 1193 userRejectedRequest error
			if (error.code === 4001) {
				throw new Error("Rejected connection request...");
			}
			throw new Error(error.message);
		}
		// Handle user accounts per EIP 1193
		accounts = await provider.send("eth_accounts");
		// https://medium.com/metamask/breaking-changes-to-the-metamask-inpage-provider-b4dde069dd0a
		// Metmask returns accounts.results rather than an array as described in their above communication
		if (accounts !== undefined && accounts !== null && typeof accounts.result !== "undefined" && Array.isArray(accounts.result)) {
			accounts = accounts.result;
		}
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

EnsLibrary.prototype.getWeb3 = async function() {
	// Instantiate Web3 if applicable
	if (this.web3 == undefined || this.web3 == null) {
		// Retrieve the current provider
		const provider = this.getProvider();
		// Load Web3
		await this.loadWeb3Library();
		// Instantiate Web3
		this.web3 = new window.Web3(provider);
		// Current api info
		if ($tw.utils.getIpfsVerbose()) console.info("Web3 Api version: " + this.web3.version);
		// Current provider
		const info = await this.web3.eth.getNodeInfo();
		if ($tw.utils.getIpfsVerbose()) console.info("Ethereum provider: " + info);
	}
	return this.web3;
}

EnsLibrary.prototype.getRegistryAddress = async function(web3) {
	// Check
	if (web3 == undefined || web3 == null) {
		throw new Error("Undefined web3...");
	}
	const networkId = await web3.eth.net.getId();
	// Retrieve Ethereum Ens Registry address
	var network;
	try {
		network = this.contracts[networkId];
	} catch (error) {
		console.error(error.message);
		throw new Error("Unsupported Ethereum network: " + networkId);
	}
	if ($tw.utils.getIpfsVerbose()) console.info(network.name);
	// Return registry address
	return network.registry;
}

EnsLibrary.prototype.getWeb3Provider = async function() {
	// Retrieve the current provider
	const provider = this.getProvider();
	// Load ethers
	if (typeof window.ethers === "undefined") {
		await this.loadEtherJsLibrary();
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
		console.error(error.message);
		throw new Error("Unsupported Ethereum network: " + networkId);
	}
	if ($tw.utils.getIpfsVerbose()) console.info(network.name);
	// Load ethers
	if (typeof window.ethers === "undefined") {
		await this.loadEtherJsLibrary();
	}
	// https://github.com/ensdomains/ui/blob/master/src/ens.js
	const ens = new window.ethers.Contract(network.registry, ensContract, web3Provider.getSigner());
	// Return ens contract
	return ens;
}

EnsLibrary.prototype.getResolverAddress = async function(web3, account, registryAddress, node) {
	// Check
	if (web3 == undefined || web3 == null) {
		throw new Error("Undefined web3...");
	}
	if (account == undefined || account == null || account.trim() === "") {
		throw new Error("Undefined Ethereum account...");
	}
	if (registryAddress == undefined || registryAddress == null || registryAddress.trim() === "") {
		throw new Error("Undefined Ens registry address...");
	}
	if (node == undefined || node == null || node.trim() === "") {
		throw new Error("Undefined Ens domain hash...");
	}
	// Low level call
	const data = this.encodedMethod("resolver", ["bytes32"], [node]);
	const result = await web3.eth.call({ from: account, to: registryAddress, data: data });
	// decode if applicable
	var decoded = null;
	if (result != null) {
		try {
			decoded = web3.eth.abi.decodeParameter("address", result);
		} catch (error) {
			console.error(error.message);
		}
	}
	// Return
	return decoded;
}

// https://eips.ethereum.org/EIPS/eip-165
EnsLibrary.prototype.checkEip165 = async function(web3, account, address) {
	// Check
	if (web3 == undefined || web3 == null) {
		throw new Error("Undefined web3...");
	}
	if (account == undefined || account == null || account.trim() === "") {
		throw new Error("Undefined Ethereum account...");
	}
	if (address == undefined || address == null || address.trim() === "") {
		throw new Error("Undefined Ethereum address...");
	}
	// true when interfaceID is 0x01ffc9a7
	var data = this.encodedMethod("supportsInterface", ["bytes4"], ["0x01ffc9a7"]);
	var result = await web3.eth.call({ from: account, to: address, data: data });
	// decode
	var decoded = web3.eth.abi.decodeParameter("bool", result);
	if (decoded == false) {
		return false;
	}
	// false when interfaceID is 0xffffffff
	var data = this.encodedMethod("supportsInterface", ["bytes4"], ["0xffffffff"]);
	var result = await web3.eth.call({ from: account, to: address, data: data });
	// decode
	var decoded = web3.eth.abi.decodeParameter("bool", result);
	if (decoded == false) {
		return true;
	}
	// return
	return false;
}

// https://eips.ethereum.org/EIPS/eip-1577
EnsLibrary.prototype.checkEip1577 = async function(web3, account, address) {
	// check
	if (web3 == undefined || web3 == null) {
		throw new Error("Undefined web3...");
	}
	if (account == undefined || account == null || account.trim() === "") {
		throw new Error("Undefined Ethereum account...");
	}
	if (address == undefined || address == null || address.trim() === "") {
		throw new Error("Undefined Ethereum address...");
	}
	// contenthash
	var data = this.encodedMethod("supportsInterface", ["bytes4"], ["0xbc1c58d1"]);
	var result = await web3.eth.call({ from: account, to: address, data: data });
	// decode
	var decoded = web3.eth.abi.decodeParameter("bool", result);
	if (decoded == false) {
		return false;
	}
	// true when interfaceID is 0xbc1c58d1
	var data = this.encodedMethod("supportsInterface", ["bytes4"], ["0xbc1c58d1"]);
	var result = await web3.eth.call({ from: account, to: address, data: data });
	// decode
	var decoded = web3.eth.abi.decodeParameter("bool", result);
	// return
	return decoded;
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
	const resolver = new window.ethers.Contract(resolverAddress, resolverContract, web3Provider.getSigner());
	return resolver;
}

EnsLibrary.prototype.getContenthash = async function(domain) {

	if (domain == undefined || domain == null || domain.trim() === "") {
		throw new Error("Undefined Ens domain...");
	}

	// Retrieve the current provider
	const provider = this.getProvider();

	// Retrieve web3
	const web3 = await this.getWeb3();

	// Enable provider
	const account = await this.enableProvider(provider);
	if ($tw.utils.getIpfsVerbose()) console.info("Selected account: " + account);

	// Resolve domain as namehash
	const domainHash = namehash.hash(domain);

	// Fetch ens registry address
	const registryAddress = await this.getRegistryAddress(web3);

	// Fetch resolver address
	var resolverAddress = await this.getResolverAddress(web3, account, registryAddress, domainHash);

	// Check
	if (resolverAddress == null || /^0x0+$/.test(resolverAddress) == true) {
		throw new Error("Undefined Ens resolver...");
	}
	if ($tw.utils.getIpfsVerbose()) console.info("Ens resolver address: " + resolverAddress);

	// Check if resolver is EIP165
	const eip165 = await this.checkEip165(web3, account, resolverAddress);
	if (eip165 == false) {
		throw new Error("Ens resolver do not conform to EIP165...");
	}

	// Check if resolver is EIP1577
	const eip1577 = await this.checkEip1577(web3, account, resolverAddress);
	if (eip1577 == false) {
		throw new Error("Ens resolver do not conform to EIP1577...");
	}

	// retrieve content hash
	// false when interfaceID is 0xffffffff
	const data = this.encodedMethod("contenthash", ["bytes32"], [domainHash]);
	const result = await web3.eth.call({ from: account, to: resolverAddress, data: data });
	// decode bytes result
	var decoded = web3.eth.abi.decodeParameter("bytes", result);
	if (decoded == undefined || decoded == null || decoded.trim() === "") {
		return {
			decoded: null,
			protocol: null
		}
	}
	// decode content hash
	var { decoded, protocol } = this.decodeContenthash(decoded);
	return {
		decoded: decoded,
		protocol: protocol
	};

}

EnsLibrary.prototype.setContenthash = async function(domain, cid) {
	if (domain == undefined || domain == null || domain.trim() === "") {
		throw new Error("Undefined Ens domain...");
	}
	if (cid == undefined || cid == null || cid.trim() === "") {
		throw new Error("Undefined Ipfs identifier...");
	}
	// Retrieve the current provider
	const provider = this.getProvider();
	// Getting web3 provider
	const web3Provider = await this.getWeb3Provider();
	// Load Ens registry
	const ens = await this.getEns(web3Provider);
	// Encode cid
	const encoded = this.encodeContenthash("ipfs://" + cid);
	// Enable provider
	const account = await this.enableProvider(provider);
	if ($tw.utils.getIpfsVerbose()) console.info("Selected account: " + account);
	// Resolve domain as namehash
	const domainHash = window.ethers.utils.namehash(domain);
	// Fetch resolver address
	const resolverAddress = await ens.resolver(domainHash);
	// Exist
	if (resolverAddress == null || /^0x0+$/.test(resolverAddress) == true) {
		throw new Error("Undefined Ens resolver address...");
	}
	if ($tw.utils.getIpfsVerbose()) console.info("Ens resolver address: " + resolverAddress);
	// Check resolver
	const resolver = await this.getResolver(resolverAddress, web3Provider);
	// Set Contenthash
	if ($tw.utils.getIpfsVerbose()) console.info("Processing Ens resolver set content...");
	const tx = await resolver.setContenthash(domainHash, encoded);
	if ($tw.utils.getIpfsVerbose()) console.info("Processing Transaction: " + tx.hash);
	// Wait for transaction completion
	await tx.wait();
}

exports.EnsLibrary = EnsLibrary;

})();
