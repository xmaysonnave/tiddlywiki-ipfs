/*\
title: $:/plugins/ipfs/ens-library.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

EnsLibrary

\*/

import CID from "cids";
import contentHash from "content-hash";

(function() {
  /*jslint node: true, browser: true*/
  /*global $tw: false*/
  "use strict";

  /**
   * https://github.com/purposeindustries/window-or-global
   * The MIT License (MIT) Copyright (c) Purpose Industries
   * version: 1.0.1
   */
  const root =
    (typeof self === "object" && self.self === self && self) ||
    (typeof global === "object" && global.global === global && global) ||
    this;

  const name = "ens-library";

  var EnsLibrary = function() {
    this.network = {
      1: "Ethereum Main Network: 'Mainnet', chainId: '1'",
      3: "Ethereum Test Network (PoW): 'Ropsten', chainId: '3'",
      4: "Ethereum Test Network (PoA): 'Rinkeby', chainId: '4'",
      5: "Ethereum Test Network (PoA): 'Goerli', chainId: '5'",
      42: "Ethereum Test Network (PoA): 'Kovan', chainId: '42'"
    };
    this.etherscan = {
      1: "https://etherscan.io",
      3: "https://ropsten.etherscan.io",
      4: "https://rinkeby.etherscan.io",
      5: "https://goerli.etherscan.io",
      42: "https://kovan.etherscan.io"
    };
    // https://docs.ens.domains/ens-deployments
    // https://github.com/ensdomains/ui/blob/master/src/ens.js
    this.registry = {
      1: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
      3: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
      4: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
      5: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
    };
  };

  EnsLibrary.prototype.getLogger = function() {
    return root.log.getLogger(name);
  };

  EnsLibrary.prototype.getEtherscanRegistry = function() {
    return this.etherscan;
  };

  EnsLibrary.prototype.getNetwork = function() {
    return this.network;
  };

  EnsLibrary.prototype.getENSRegistry = function() {
    return this.registry;
  };

  EnsLibrary.prototype.getLogger = function() {
    return root.log.getLogger(name);
  };

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
  };

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
  };

  EnsLibrary.prototype.enableProvider = async function(provider) {
    // Check
    if (provider == undefined || provider == null) {
      throw new Error("Undefined Ethereum provider...");
    }
    // Enable Provider
    var accounts = null;
    // Handle connection, per EIP 1102
    if (typeof provider.send === "function") {
      try {
        await provider.send("eth_requestAccounts");
      } catch (error) {
        // EIP 1193 userRejectedRequest error
        if (error.code === 4001) {
          throw new Error("User rejected request...");
        }
        throw new Error(error.message);
      }
      // Handle user accounts per EIP 1193
      accounts = await provider.send("eth_accounts");
      // https://medium.com/metamask/breaking-changes-to-the-metamask-inpage-provider-b4dde069dd0a
      // Metamask returns accounts.results rather than an array as described in their above communication
      if (
        accounts !== undefined &&
        accounts !== null &&
        typeof accounts.result !== "undefined" &&
        Array.isArray(accounts.result)
      ) {
        accounts = accounts.result;
      }
      // Legacy
    } else if (typeof provider.enable === "function") {
      accounts = await provider.enable();
    }
    if (accounts == undefined || accounts == null || Array.isArray(accounts) == false || accounts.length == 0) {
      throw new Error("Unable to retrieve an Ethereum account...");
    }
    // Return First account
    return accounts[0];
  };

  EnsLibrary.prototype.getProvider = async function() {
    // Retrieve an available Ethereum provider
    var provider = null;
    if (typeof root.ethereum !== "undefined") {
      provider = root.ethereum;
      this.getLogger().info("Ethereum provider: 'window.ethereum'...");
    }
    if (provider == null && root.web3 !== undefined && root.web3.currentProvider !== undefined) {
      provider = root.web3.currentProvider;
      this.getLogger().info("Ethereum provider: 'window.web3.currentProvider'...");
    }
    if (provider == null) {
      throw new Error("Unavailable Ethereum provider.\nYou should consider installing Frame or MetaMask...");
    }
    // https://docs.metamask.io/guide/ethereum-provider.html#methods-current-api
    if (provider.isMetaMask) {
      provider.autoRefreshOnNetworkChange = false;
    }
    // return provider
    return provider;
  };

  EnsLibrary.prototype.getEnabledWeb3Provider = async function(provider) {
    // Check
    if (provider == undefined || provider == null) {
      throw new Error("Undefined Ethereum provider...");
    }
    if (root.ethers == undefined || root.ethers == null) {
      await this.loadEthers();
    }
    // Enable provider
    // https://github.com/ethers-io/ethers.js/issues/433
    const account = await this.enableProvider(provider);
    // Instantiate a Web3Provider
    const web3 = new root.ethers.providers.Web3Provider(provider);
    // Retrieve current network
    const network = await web3.getNetwork();
    return {
      web3: web3,
      chainId: network.chainId,
      account: account
    };
  };

  EnsLibrary.prototype.loadEthers = async function() {
    if (root.ethers == undefined || root.ethers == null) {
      try {
        // Load ethers with sri
        await $tw.ipfs.getLoader().loadEtherJsLibrary();
        if (root.ethers !== undefined && root.ethers !== null) {
          return;
        }
      } catch (error) {
        this.getLogger().error(error);
      }
      // Should not happen...
      throw new Error("Unavailable Ethereum library...");
    }
  };

  EnsLibrary.prototype.getWeb3Provider = async function(provider) {
    // Check
    if (provider == undefined || provider == null) {
      throw new Error("Undefined Ethereum provider...");
    }
    if (root.ethers == undefined || root.ethers == null) {
      await this.loadEthers();
    }
    // Instantiate an ethers Web3Provider
    const web3 = new root.ethers.providers.Web3Provider(provider);
    // Retrieve the current network
    const network = await web3.getNetwork();
    return {
      web3: web3,
      chainId: network.chainId
    };
  };

  EnsLibrary.prototype.getRegistry = async function(web3) {
    // Check
    if (web3 == undefined || web3 == null) {
      throw new Error("Undefined Web3 provider...");
    }
    // Retrieve network
    const network = await web3.getNetwork();
    // Retrieve an Ethereum ENS Registry address
    var registry = null;
    try {
      registry = this.registry[network.chainId];
    } catch (error) {
      this.getLogger().error(error);
    }
    if (registry == undefined || registry == null) {
      throw new Error("Unsupported Ethereum network: " + network.chainId);
    }
    // Return registry address
    return {
      chainId: network.chainId,
      registry: registry
    };
  };

  EnsLibrary.prototype.getResolver = async function(web3, registry, node) {
    // Check
    if (web3 == undefined || web3 == null) {
      throw new Error("Undefined Web3 provider...");
    }
    if (registry == undefined || registry == null || registry.trim() === "") {
      throw new Error("Undefined ENS registry address...");
    }
    if (node == undefined || node == null || node.trim() === "") {
      throw new Error("Undefined ENS domain resolver...");
    }
    if (root.ethers == undefined || root.ethers == null) {
      await this.loadEthers();
    }
    // Low level call
    const abi = [{ name: "resolver", type: "function", inputs: [{ type: "bytes32" }] }];
    const iface = new root.ethers.utils.Interface(abi);
    const data = iface.functions.resolver.encode([node]);
    const result = await web3.call({ to: registry, data: data });
    if (result == undefined || result == null || result === "0x") {
      return null;
    }
    // decode if applicable
    try {
      const decoded = root.ethers.utils.defaultAbiCoder.decode(["address"], result);
      return decoded[0];
    } catch (error) {
      this.getLogger().error(error);
    }
    // Return
    return null;
  };

  // https://eips.ethereum.org/EIPS/eip-165
  EnsLibrary.prototype.checkEip165 = async function(web3, address) {
    // Check
    if (web3 == undefined || web3 == null) {
      throw new Error("Undefined Web3 provider...");
    }
    if (address == undefined || address == null || address.trim() === "") {
      throw new Error("Undefined Ethereum address...");
    }
    if (root.ethers == undefined || root.ethers == null) {
      await this.loadEthers();
    }
    // true when interfaceID is 0x01ffc9a7
    var abi = [{ name: "supportsInterface", type: "function", inputs: [{ type: "bytes4" }] }];
    var iface = new root.ethers.utils.Interface(abi);
    var data = iface.functions.supportsInterface.encode(["0x01ffc9a7"]);
    var result = await web3.call({ to: address, data: data });
    if (result == undefined || result == null || result === "0x") {
      return false;
    }
    // decode
    try {
      var decoded = root.ethers.utils.defaultAbiCoder.decode(["bool"], result);
      if (decoded[0] == false) {
        return false;
      }
    } catch (error) {
      this.getLogger().error(error);
      return false;
    }
    // false when interfaceID is 0xffffffff
    var data = iface.functions.supportsInterface.encode(["0xffffffff"]);
    var result = await web3.call({ to: address, data: data });
    if (result == undefined || result == null || result === "0x") {
      return false;
    }
    // decode
    try {
      var decoded = root.ethers.utils.defaultAbiCoder.decode(["bool"], result);
      // conform to spec
      if (decoded[0] == false) {
        return true;
      }
    } catch (error) {
      this.getLogger().error(error);
    }
    // do not conform to spec
    return false;
  };

  // https://eips.ethereum.org/EIPS/eip-1577
  EnsLibrary.prototype.checkEip1577 = async function(web3, address) {
    // check
    if (web3 == undefined || web3 == null) {
      throw new Error("Undefined Web3 provider...");
    }
    if (address == undefined || address == null || address.trim() === "") {
      throw new Error("Undefined Ethereum address...");
    }
    if (root.ethers == undefined || root.ethers == null) {
      await this.loadEthers();
    }
    // contenthash, true when interfaceID is 0xbc1c58d1
    var abi = [{ name: "supportsInterface", type: "function", inputs: [{ type: "bytes4" }] }];
    var iface = new root.ethers.utils.Interface(abi);
    var data = iface.functions.supportsInterface.encode(["0xbc1c58d1"]);
    var result = await web3.call({ to: address, data: data });
    if (result == undefined || result == null || result === "0x") {
      return false;
    }
    try {
      // decode
      var decoded = root.ethers.utils.defaultAbiCoder.decode(["bool"], result);
      if (decoded[0] == false) {
        return false;
      }
    } catch (error) {
      this.getLogger().error(error);
      return false;
    }
    // return
    return true;
  };

  EnsLibrary.prototype.getContenthash = async function(domain, web3) {
    // check
    if (domain == undefined || domain == null) {
      throw new Error("Undefined ENS domain...");
    }
    if (root.ethers == undefined || root.ethers == null) {
      await this.loadEthers();
    }

    if (web3 == undefined) {
      var { web3 } = await this.getWeb3Provider();
    }

    // Resolve domain as namehash
    const domainHash = root.ethers.utils.namehash(domain);

    // Fetch ens registry address
    const { chainId, registry } = await this.getRegistry(web3);

    // Log
    this.getLogger().info("ENS registry:" + "\n " + this.etherscan[chainId] + "/address/" + registry);

    // Fetch resolver address
    var resolver = await this.getResolver(web3, registry, domainHash);

    // Check
    if (resolver == null || /^0x0+$/.test(resolver) == true) {
      throw new Error("Undefined ENS domain resolver...");
    }

    // Log
    this.getLogger().info("ENS domain resolver:" + "\n " + this.etherscan[chainId] + "/address/" + resolver);

    // Check if resolver is EIP165
    const eip165 = await this.checkEip165(web3, resolver);
    if (eip165 == false) {
      throw new Error("ENS domain resolver do not conform to EIP165...");
    }

    // Check if resolver is EIP1577
    const eip1577 = await this.checkEip1577(web3, resolver);
    if (eip1577 == false) {
      throw new Error("ENS domain resolver do not conform to EIP1577...");
    }

    // retrieve content hash
    this.getLogger().info("Processing ENS domain content...");
    const abi = [{ name: "contenthash", type: "function", inputs: [{ type: "bytes32" }] }];
    const iface = new root.ethers.utils.Interface(abi);
    const data = iface.functions.contenthash.encode([domainHash]);
    const result = await web3.call({ to: resolver, data: data });
    if (result == undefined || result == null || result === "0x") {
      return {
        content: null,
        protocol: null
      };
    }

    // decode bytes result
    var content = root.ethers.utils.defaultAbiCoder.decode(["bytes"], result);
    if (content == undefined || content == null || Array.isArray(content) === false || content[0] === "0x") {
      return {
        content: null,
        protocol: null
      };
    }

    // decode content hash
    var { decoded, protocol } = this.decodeContenthash(content[0]);

    return {
      content: decoded,
      protocol: protocol
    };
  };

  EnsLibrary.prototype.setContenthash = async function(domain, cid, web3, account) {
    // check
    if (domain == undefined || domain == null) {
      throw new Error("Undefined ENS domain...");
    }
    if (cid == undefined || cid == null) {
      throw new Error("Undefined IPFS identifier...");
    }

    // Retrieve an enabled web3 provider
    if (web3 == undefined || account == undefined) {
      var { web3, account } = await this.getEnabledWeb3Provider();
    }

    // Resolve domain as namehash
    const domainHash = root.ethers.utils.namehash(domain);

    // Fetch ens registry address
    const { chainId, registry } = await this.getRegistry(web3);

    // Log
    this.getLogger().info("ENS registry:" + "\n " + this.etherscan[chainId] + "/address/" + registry);

    // Fetch resolver address
    var resolver = await this.getResolver(web3, registry, domainHash);

    // Check
    if (resolver == null || /^0x0+$/.test(resolver) == true) {
      throw new Error("Undefined ENS resolver...");
    }

    // Log
    this.getLogger().info("ENS domain resolver:" + "\n " + this.etherscan[chainId] + "/address/" + resolver);

    // Check if resolver is EIP165
    const eip165 = await this.checkEip165(web3, resolver);
    if (eip165 == false) {
      throw new Error("ENS resolver do not conform to EIP165...");
    }

    // Check if resolver is EIP1577
    const eip1577 = await this.checkEip1577(web3, resolver);
    if (eip1577 == false) {
      throw new Error("ENS resolver do not conform to EIP1577...");
    }

    // Encode cid
    const { encoded } = this.encodeContenthash("ipfs://" + cid);

    // Set Contenthash
    this.getLogger().info("Processing ENS domain content...");
    const abi = [{ name: "setContenthash", type: "function", inputs: [{ type: "bytes32" }, { type: "bytes" }] }];
    const iface = new root.ethers.utils.Interface(abi);
    const data = iface.functions.setContenthash.encode([domainHash, encoded]);
    const signer = web3.getSigner();
    const tx = await signer.sendTransaction({ to: resolver, data: data });
    this.getLogger().info("Processing Transaction:" + "\n " + this.etherscan[chainId] + "/tx/" + tx.hash);

    // Wait for transaction completion
    await tx.wait();
    this.getLogger().info("Processed ENS domain content...");

    return;
  };

  exports.EnsLibrary = EnsLibrary;
})();
