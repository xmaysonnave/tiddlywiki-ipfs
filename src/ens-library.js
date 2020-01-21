/*\
title: $:/plugins/ipfs/ens-library.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

EnsLibrary

\*/

import CID  from "cids";
import contentHash from "content-hash";

(function(){

/*jslint node: true, browser: true*/
/*global $tw: false*/
"use strict";

var EnsLibrary = function() {
  // https://github.com/ensdomains/ui/blob/master/src/ens.js
  this.registries = {
    1: {
      address: "0x314159265dd8dbb310642f98f50c066173c1259b",
      network: "Ethereum Main Network: 'Mainnet', chainId: '1'"
    },
    3: {
      address: "0x112234455c3a32fd11230c42e7bccd4a84e02010",
      network: "Ethereum Test Network (PoW): 'Ropsten', chainId: '3'"
    },
    4: {
      address: "0xe7410170f87102df0055eb195163a03b7f2bff4a",
      network: "Ethereum Test Network (PoA): 'Rinkeby', chainId: '4'"
    },
    5: {
      address: "0x112234455c3a32fd11230c42e7bccd4a84e02010",
      network: "Ethereum Test Network (PoA): 'Goerli', chainId: '5'"
    }
  };
  // Logger
  try {
    this.logger = new $tw.utils.Logger("ipfs");
  } catch (error) {
    this.logger = console;
  }
};

// https://www.srihash.org/
// https://github.com/ethers-io/ethers.js/
EnsLibrary.prototype.loadEtherJsLibrary = async function() {
  return await $tw.utils.loadLibrary(
    "EtherJsLibrary",
    "https://cdn.jsdelivr.net/npm/ethers@4.0.43/dist/ethers.min.js",
    "sha384-QRwmP146iWM3rRaoUqzKQqvZ7EH8SVSIr9V411ZVGJrQrOPUZdEoAMEeeswO7ATu",
    true
  );
}

EnsLibrary.prototype.isVerbose = function() {
  try {
    return $tw.utils.getIpfsVerbose();
  } catch (error) {
    return false;
  }
}

// https://github.com/ensdomains/ui/blob/master/src/utils/contents.js
EnsLibrary.prototype.decodeContenthash = function(content) {
  let decoded, protocol;
  if (content.error) {
    throw new Error(content.error);
  }
  if (content) {
    const codec = contentHash.getCodec(content);
    decoded = contentHash.decode(content);
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

// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1577.md
EnsLibrary.prototype.encodeContenthash = function(content) {
  let type;
  let text;
  let encoded;
  if (!!content) {
    const matched = content.match(/^(ipfs|bzz|onion|onion3):\/\/(.*)/) || content.match(/\/(ipfs)\/(.*)/);
    if (matched) {
      type = matched[1];
      text = matched[2];
    }
    if (type === "ipfs") {
      if (text.length >= 4) {
        const cid = new CID(text);
        if (cid.version !== 0) {
            throw new Error("ENS domain content should be Base58 (CidV0): " + text);
        }
        encoded = "0x" + contentHash.fromIpfs(text);
      }
    } else {
      throw new Error("Unsupported ENS domain protocol: " + type);
    }
  }
  return {
    encoded: encoded
  };
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
    // Metamask returns accounts.results rather than an array as described in their above communication
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
    if (this.isVerbose()) this.logger.info("Ethereum provider: 'window.ethereum'...");
  }
  if (provider == null && window.web3 !== undefined && window.web3.currentProvider !== undefined) {
    provider = window.web3.currentProvider;
    if (this.isVerbose()) this.logger.info("Ethereum provider: 'window.web3.currentProvider'...");
  }
  if (provider == null) {
    throw new Error("Unavailable Ethereum provider.\nYou should consider installing Frame or MetaMask...");
  }
  return provider;
}

EnsLibrary.prototype.getWeb3Provider = async function() {
  // Load ethers
  if (window.ethers == undefined) {
    await this.loadEtherJsLibrary();
  }
  // Retrieve provider
  const provider = this.getProvider();
  // Enable provider
  // https://github.com/ethers-io/ethers.js/issues/433
  const account = await this.enableProvider(provider);
  // Instantiate Web3Provider
  const web3Provider = new window.ethers.providers.Web3Provider(provider);
  return {
    web3Provider: web3Provider,
    account: account
  }
}

EnsLibrary.prototype.getRegistryAddress = async function(web3Provider) {
  // Check
  if (web3Provider == undefined || web3Provider == null) {
    throw new Error("Undefined web3 provider...");
  }
  const network = await web3Provider.getNetwork();
  // Retrieve Ethereum ENS Registry address
  var registry;
  try {
    registry = this.registries[network.chainId];
  } catch (error) {
    this.logger.error(error.message);
    throw new Error("Unsupported Ethereum network: " + network.chainid);
  }
  if (this.isVerbose()) this.logger.info(registry.network);
  // Return registry address
  return registry.address;
}

EnsLibrary.prototype.getResolverAddress = async function(web3Provider, account, registryAddress, node) {
  // Check
  if (web3Provider == undefined || web3Provider == null) {
    throw new Error("Undefined web3 provider...");
  }
  if (account == undefined || account == null || account.trim() === "") {
    throw new Error("Undefined Ethereum account...");
  }
  if (registryAddress == undefined || registryAddress == null || registryAddress.trim() === "") {
    throw new Error("Undefined ENS registry address...");
  }
  if (node == undefined || node == null || node.trim() === "") {
    throw new Error("Undefined ENS domain resolver...");
  }
  // Low level call
  const abi = [{ name: "resolver", type: "function", inputs: [{ type: "bytes32" }] }];
  const iface = new window.ethers.utils.Interface(abi)
  const data = iface.functions.resolver.encode([node]);
  const result = await web3Provider.call({ from: account, to: registryAddress, data: data });
  if (result == undefined || result == null || result === "0x") {
    return null;
  }
  // decode if applicable
  try {
    const decoded = window.ethers.utils.defaultAbiCoder.decode(["address"], result);
    return decoded[0];
  } catch (error) {
    this.logger.error(error.message);
  }
  // Return
  return null;
}

// https://eips.ethereum.org/EIPS/eip-165
EnsLibrary.prototype.checkEip165 = async function(web3Provider, account, address) {
  // Check
  if (web3Provider == undefined || web3Provider == null) {
    throw new Error("Undefined web3 provider...");
  }
  if (account == undefined || account == null || account.trim() === "") {
    throw new Error("Undefined Ethereum account...");
  }
  if (address == undefined || address == null || address.trim() === "") {
    throw new Error("Undefined Ethereum address...");
  }
  // true when interfaceID is 0x01ffc9a7
  var abi = [{ name: "supportsInterface", type: "function", inputs: [{ type: "bytes4" }] }];
  var iface = new window.ethers.utils.Interface(abi)
  var data = iface.functions.supportsInterface.encode(["0x01ffc9a7"]);
  var result = await web3Provider.call({ from: account, to: address, data: data });
  if (result == undefined || result == null || result === "0x") {
    return false;
  }
  // decode
  try {
    var decoded = window.ethers.utils.defaultAbiCoder.decode(["bool"], result);
    if (decoded[0] == false) {
      return false;
    }
  } catch (error) {
    this.logger.error(error.message);
    return false;
  }
  // false when interfaceID is 0xffffffff
  var data = iface.functions.supportsInterface.encode( ["0xffffffff"]);
  var result = await web3Provider.call({ from: account, to: address, data: data });
  if (result == undefined || result == null || result === "0x") {
    return false;
  }
  // decode
  try {
    var decoded = window.ethers.utils.defaultAbiCoder.decode(["bool"], result);
    // conform to spec
    if (decoded[0] == false) {
      return true;
    }
  } catch (error) {
    this.logger.error(error.message);
  }
  // do not conform to spec
  return false;
}

// https://eips.ethereum.org/EIPS/eip-1577
EnsLibrary.prototype.checkEip1577 = async function(web3Provider, account, address) {
  // check
  if (web3Provider == undefined || web3Provider == null) {
    throw new Error("Undefined web3 provider...");
  }
  if (account == undefined || account == null || account.trim() === "") {
    throw new Error("Undefined Ethereum account...");
  }
  if (address == undefined || address == null || address.trim() === "") {
    throw new Error("Undefined Ethereum address...");
  }
  // contenthash, true when interfaceID is 0xbc1c58d1
  var abi = [{ name: "supportsInterface", type: "function", inputs: [{ type: "bytes4" }] }];
  var iface = new window.ethers.utils.Interface(abi)
  var data = iface.functions.supportsInterface.encode(["0xbc1c58d1"]);
  var result = await web3Provider.call({ from: account, to: address, data: data });
  if (result == undefined || result == null || result === "0x") {
    return false;
  }
  try {
    // decode
    var decoded = window.ethers.utils.defaultAbiCoder.decode(["bool"], result);
    if (decoded[0] == false) {
      return false;
    }
  } catch (error) {
    this.logger.error(error.message);
    return false;
  }
  // return
  return true;}

EnsLibrary.prototype.getContenthash = async function(domain, web3Provider, account) {

  if (domain == undefined || domain == null) {
    throw new Error("Undefined ENS domain...");
  }

  // Retrieve web3 provider
  if (web3Provider == undefined || account == undefined) {
    var { web3Provider, account } = await this.getWeb3Provider();
  }

  // Resolve domain as namehash
  const domainHash = window.ethers.utils.namehash(domain);

  // Fetch ens registry address
  const registryAddress = await this.getRegistryAddress(web3Provider);

  // Fetch resolver address
  var resolverAddress = await this.getResolverAddress(web3Provider, account, registryAddress, domainHash);

  // Check
  if (resolverAddress == null || /^0x0+$/.test(resolverAddress) == true) {
    throw new Error("Undefined ENS domain resolver...");
  }
  if (this.isVerbose()) this.logger.info(
    "ENS domain resolver: "
    + resolverAddress
  );

  // Check if resolver is EIP165
  const eip165 = await this.checkEip165(web3Provider, account, resolverAddress);
  if (eip165 == false) {
    throw new Error("ENS domain resolver do not conform to EIP165...");
  }

  // Check if resolver is EIP1577
  const eip1577 = await this.checkEip1577(web3Provider, account, resolverAddress);
  if (eip1577 == false) {
    throw new Error("ENS domain resolver do not conform to EIP1577...");
  }

  // retrieve content hash
  if (this.isVerbose()) this.logger.info("Processing ENS domain content...");
  const abi = [{ name: "contenthash", type: "function", inputs: [{ type: "bytes32" }] }];
  const iface = new window.ethers.utils.Interface(abi)
  const data = iface.functions.contenthash.encode([domainHash]);
  const result = await web3Provider.call({ from: account, to: resolverAddress, data: data });
  if (result == undefined || result == null || result === "0x") {
    return {
      decoded: null,
      protocol: null
    }
  }
  // decode bytes result
  var content =  window.ethers.utils.defaultAbiCoder.decode(["bytes"], result);
  if (content == undefined || content == null || Array.isArray(content) === false || content[0] === "0x") {
    return {
      decoded: null,
      protocol: null
    }
  }
  // decode content hash
  try {
    var { decoded, protocol } = this.decodeContenthash(content[0]);
    return {
      decoded: decoded,
      protocol: protocol
    };
  } catch (error) {
    this.logger.error(error.message);
  }
  return {
    decoded: null,
    protocol: null
  }
}

EnsLibrary.prototype.setContenthash = async function(domain, cid, web3Provider, account) {

  if (domain == undefined || domain == null) {
    throw new Error("Undefined ENS domain...");
  }

  if (cid == undefined || cid == null) {
    throw new Error("Undefined IPFS identifier...");
  }

  // Retrieve web3 provider
  if (web3Provider == undefined || account == undefined) {
    var { web3Provider, account } = await this.getWeb3Provider();
  }

  // Resolve domain as namehash
  const domainHash = window.ethers.utils.namehash(domain);

  // Fetch ens registry address
  const registryAddress = await this.getRegistryAddress(web3Provider);

  // Fetch resolver address
  var resolverAddress = await this.getResolverAddress(web3Provider, account, registryAddress, domainHash);

  // Check
  if (resolverAddress == null || /^0x0+$/.test(resolverAddress) == true) {
    throw new Error("Undefined ENS resolver...");
  }

  if (this.isVerbose()) this.logger.info(
    "ENS resolver address: "
    + resolverAddress
  );

  // Check if resolver is EIP165
  const eip165 = await this.checkEip165(web3Provider, account, resolverAddress);
  if (eip165 == false) {
    throw new Error("ENS resolver do not conform to EIP165...");
  }

  // Check if resolver is EIP1577
  const eip1577 = await this.checkEip1577(web3Provider, account, resolverAddress);
  if (eip1577 == false) {
    throw new Error("ENS resolver do not conform to EIP1577...");
  }

  // Encode cid
  const { encoded } = this.encodeContenthash("ipfs://" + cid);

  // Set Contenthash
  try {
    if (this.isVerbose()) this.logger.info("Processing ENS domain content...");
    const abi = [{ name: "setContenthash", type: "function", inputs: [{ type: "bytes32" }, { type: "bytes" }] }];
    const iface = new window.ethers.utils.Interface(abi)
    const data = iface.functions.setContenthash.encode([domainHash, encoded]);
    const signer = web3Provider.getSigner();
    const tx = await signer.sendTransaction({ to: resolverAddress, data: data });
    if (this.isVerbose()) this.logger.info(
      "Processing Transaction: "
      + tx.hash
    );
    // Wait for transaction completion
    await tx.wait();
    if (this.isVerbose()) this.logger.info("Processed ENS domain content...");
  } catch (error) {
    if (error.message !== undefined) {
      this.logger.error(error.message);
    }
    throw new Error("Unable to set ENS domain content...");
  }

  return;

}

exports.EnsLibrary = EnsLibrary;

})();
