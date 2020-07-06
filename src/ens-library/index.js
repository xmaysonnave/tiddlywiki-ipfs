import CID from 'cids'
import contentHash from 'content-hash'
import root from 'window-or-global'
import detectEthereumProvider from '@metamask/detect-provider'
;(function () {
  'use strict'

  /*eslint no-unused-vars:"off"*/
  const name = 'ens-library'

  // https://github.com/ensdomains/resolvers
  var EnsLibrary = function (ipfsLoader) {
    this.ipfsLoader = ipfsLoader
    this.network = {
      0x1: 'Ethereum Main Network: "Mainnet", chainId: "0x1"',
      0x3: 'Ethereum Test Network (PoW): "Ropsten", chainId: "0x3"',
      0x4: 'Ethereum Test Network (PoA): "Rinkeby", chainId: "0x4"',
      0x5: 'Ethereum Test Network (PoA): "Goerli", chainId: "0x5"',
      0x2a: 'Ethereum Test Network (PoA): "Kovan", chainId: "0x2a"'
    }
    this.etherscan = {
      0x1: 'https://etherscan.io',
      0x3: 'https://ropsten.etherscan.io',
      0x4: 'https://rinkeby.etherscan.io',
      0x5: 'https://goerli.etherscan.io',
      0x2a: 'https://kovan.etherscan.io'
    }
    // https://docs.ens.domains/ens-deployments
    // https://github.com/ensdomains/ui/blob/master/src/ens.js
    this.registry = {
      0x1: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
      0x3: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
      0x4: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
      0x5: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
    }
  }

  EnsLibrary.prototype.getLogger = function () {
    if (root.logger !== undefined && root.logger !== null) {
      return root.logger
    }
    return console
  }

  EnsLibrary.prototype.getEtherscanRegistry = function () {
    return this.etherscan
  }

  EnsLibrary.prototype.getNetworkRegistry = function () {
    return this.network
  }

  EnsLibrary.prototype.getENSRegistry = function () {
    return this.registry
  }

  EnsLibrary.prototype.loadEthers = async function () {
    if (root.ethers === undefined || root.ethers == null) {
      try {
        // Load ethers
        await this.ipfsLoader.loadEtherJsLibrary()
        if (root.ethers !== undefined && root.ethers !== null) {
          return
        }
      } catch (error) {
        this.getLogger().error(error)
      }
      // Should not happen...
      throw new Error('Unavailable Ethereum library...')
    }
  }

  // https://github.com/ensdomains/ui/blob/master/src/utils/contents.js
  EnsLibrary.prototype.decodeContenthash = function (content) {
    var decoded = null
    var protocol = null
    if (content.error) {
      throw new Error(content.error)
    }
    if (content) {
      const codec = contentHash.getCodec(content)
      decoded = contentHash.decode(content)
      if (codec === 'ipfs-ns') {
        protocol = 'ipfs'
      } else if (codec === 'swarm-ns') {
        protocol = 'bzz'
      } else if (codec === 'onion') {
        protocol = 'onion'
      } else if (codec === 'onion3') {
        protocol = 'onion3'
      }
    }
    return {
      decoded: decoded,
      protocol: protocol
    }
  }

  // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1577.md
  EnsLibrary.prototype.encodeContenthash = function (content) {
    var type = null
    var text = null
    var encoded = null
    content =
      content === undefined || content == null || content.trim() === ''
        ? null
        : content.trim()
    if (content == null) {
      return null
    }
    const matched =
      content.match(/^(ipfs|bzz|onion|onion3):\/\/(.*)/) ||
      content.match(/\/(ipfs)\/(.*)/)
    if (matched) {
      type = matched[1]
      text = matched[2]
    }
    if (type === 'ipfs') {
      if (text.length >= 4) {
        const cid = new CID(text)
        if (cid.version !== 0) {
          throw new Error(
            `ENS domain content should be Base58 (CidV0): ${text}`
          )
        }
        encoded = '0x' + contentHash.fromIpfs(text)
      }
    } else {
      throw new Error(`Unsupported ENS domain protocol: ${type}`)
    }
    return {
      encoded: encoded
    }
  }

  EnsLibrary.prototype.getPublicEncryptionKey = async function (
    provider,
    account
  ) {
    try {
      if (provider === undefined || provider == null) {
        provider = await this.getEthereumProvider()
      }
      if (account === undefined) {
        account = await this.getAccount(provider)
      }
      const encryptionKey = await provider.request({
        method: 'eth_getEncryptionPublicKey',
        params: [account]
      })
      return encryptionKey
    } catch (error) {
      // EIP 1193 user Rejected Request
      if (error.code === 4001) {
        const err = new Error('Rejected User Request...')
        err.name = 'RejectedUserRequest'
        this.getLogger().error(error)
        throw err
      }
      throw error
    }
  }

  /*
   * https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
   * https://eips.ethereum.org/EIPS/eip-1193
   * https://docs.metamask.io/guide/ethereum-provider.html#methods-current-api
   */
  EnsLibrary.prototype.getEthereumProvider = async function () {
    var provider = null
    try {
      provider = await detectEthereumProvider({ mustBeMetaMask: true })
      if (provider !== undefined && provider !== null) {
        provider.autoRefreshOnNetworkChange = false
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    if (provider === undefined || provider == null) {
      throw new Error('Please install MetaMask...')
    }
    return provider
  }

  /*
   * https://docs.metamask.io/guide/provider-migration.html#migrating-to-the-new-provider-api
   */
  EnsLibrary.prototype.getAccount = async function (provider) {
    if (provider === undefined || provider == null) {
      provider = await this.getEthereumProvider()
    }
    try {
      var accounts = await provider.request({ method: 'eth_accounts' })
      if (
        accounts === undefined ||
        accounts == null ||
        Array.isArray(accounts) === false ||
        accounts.length === 0
      ) {
        accounts = await provider.request({ method: 'eth_requestAccounts' })
      }
      if (
        accounts === undefined ||
        accounts == null ||
        Array.isArray(accounts) === false ||
        accounts.length === 0
      ) {
        throw new Error('Unable to retrieve any Ethereum accounts...')
      }
      this.getLogger().info(`Account: ${accounts[0]}`)
      return accounts[0]
    } catch (error) {
      // EIP 1193 user Rejected Request
      if (error.code === 4001) {
        const err = new Error('Rejected User Request...')
        err.name = 'RejectedUserRequest'
        this.getLogger().error(error)
        throw err
      }
      throw error
    }
  }

  EnsLibrary.prototype.getEnabledWeb3Provider = async function (provider) {
    if (provider === undefined || provider == null) {
      provider = await this.getEthereumProvider()
    }
    if (root.ethers === undefined || root.ethers == null) {
      await this.loadEthers()
    }
    // Enable provider
    // https://github.com/ethers-io/ethers.js/issues/433
    const account = await this.getAccount(provider)
    // Instantiate a Web3Provider
    const web3 = new root.ethers.providers.Web3Provider(provider, 'any')
    // Retrieve current network
    const network = await web3.getNetwork()
    const chainId = parseInt(network.chainId)
    return {
      account: account,
      chainId: chainId,
      web3: web3
    }
  }

  EnsLibrary.prototype.getWeb3Provider = async function (provider) {
    if (provider === undefined || provider == null) {
      provider = await this.getEthereumProvider()
    }
    if (root.ethers === undefined || root.ethers == null) {
      await this.loadEthers()
    }
    // Instantiate an ethers Web3Provider
    const web3 = new root.ethers.providers.Web3Provider(provider, 'any')
    // Retrieve current network
    const network = await web3.getNetwork()
    const chainId = parseInt(network.chainId)
    return {
      web3: web3,
      chainId: chainId
    }
  }

  EnsLibrary.prototype.getRegistry = async function (web3) {
    if (web3 === undefined || web3 == null) {
      throw new Error('Undefined Web3 provider...')
    }
    // Retrieve network
    const network = await web3.getNetwork()
    const chainId = parseInt(network.chainId)
    // Retrieve an Ethereum ENS Registry address
    var registry = null
    try {
      registry = this.registry[chainId]
    } catch (error) {
      this.getLogger().error(error)
    }
    if (registry === undefined || registry == null) {
      throw new Error(`Unsupported Ethereum network: ${chainId}`)
    }
    // Return registry address
    return {
      chainId: chainId,
      registry: registry
    }
  }

  EnsLibrary.prototype.getResolver = async function (web3, registry, node) {
    if (web3 === undefined || web3 == null) {
      throw new Error('Undefined Web3 provider...')
    }
    node =
      node === undefined || node == null || node.trim() === ''
        ? null
        : node.trim()
    if (node == null) {
      throw new Error('Undefined ENS domain resolver...')
    }
    registry =
      registry === undefined || registry == null || registry.trim() === ''
        ? null
        : registry.trim()
    if (registry == null) {
      throw new Error('Undefined ENS registry address...')
    }
    const abi = [
      'function resolver(bytes32 node) external view returns (address)'
    ]
    const iface = new root.ethers.utils.Interface(abi)
    const data = iface.encodeFunctionData('resolver', [node])
    const result = await web3.call({ to: registry, data: data })
    if (result === undefined || result == null || result === '0x') {
      return null
    }
    try {
      const decoded = iface.decodeFunctionResult('resolver', result)
      if (
        decoded !== undefined &&
        decoded !== null &&
        Array.isArray(decoded) &&
        decoded.length > 0
      ) {
        return decoded[0]
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    // Return
    return null
  }

  // https://eips.ethereum.org/EIPS/eip-165
  EnsLibrary.prototype.checkEip165 = async function (web3, address) {
    if (web3 === undefined || web3 == null) {
      throw new Error('Undefined Web3 provider...')
    }
    address =
      address === undefined || address == null || address.trim() === ''
        ? null
        : address.trim()
    if (address == null) {
      throw new Error('Undefined Ethereum address...')
    }
    var abi = [
      'function supportsInterface(bytes4 interfaceID) public pure returns(bool)'
    ]
    var iface = new root.ethers.utils.Interface(abi)
    var data = iface.encodeFunctionData('supportsInterface', ['0x01ffc9a7'])
    var result = await web3.call({ to: address, data: data })
    if (result === undefined || result == null || result === '0x') {
      return false
    }
    try {
      var decoded = iface.decodeFunctionResult('supportsInterface', result)
      if (
        decoded !== undefined &&
        decoded !== null &&
        Array.isArray(decoded) &&
        decoded.length > 0
      ) {
        if (decoded[0] === false) {
          return false
        }
      }
    } catch (error) {
      this.getLogger().error(error)
      return false
    }
    var data = iface.encodeFunctionData('supportsInterface', ['0xffffffff'])
    var result = await web3.call({ to: address, data: data })
    if (result === undefined || result == null || result === '0x') {
      return false
    }
    try {
      var decoded = iface.decodeFunctionResult('supportsInterface', result)
      if (
        decoded !== undefined &&
        decoded !== null &&
        Array.isArray(decoded) &&
        decoded.length > 0
      ) {
        // conform to spec
        if (decoded[0] === false) {
          return true
        }
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    // do not conform to spec
    return false
  }

  // https://eips.ethereum.org/EIPS/eip-1577
  EnsLibrary.prototype.checkEip1577 = async function (web3, address) {
    if (web3 === undefined || web3 == null) {
      throw new Error('Undefined Web3 provider...')
    }
    address =
      address === undefined || address == null || address.trim() === ''
        ? null
        : address.trim()
    if (address == null) {
      throw new Error('Undefined Ethereum address...')
    }
    // contenthash, true when interfaceID is 0xbc1c58d1
    var abi = [
      'function supportsInterface(bytes4 interfaceID) public pure returns(bool)'
    ]
    var iface = new root.ethers.utils.Interface(abi)
    var data = iface.encodeFunctionData('supportsInterface', ['0xbc1c58d1'])
    var result = await web3.call({ to: address, data: data })
    if (result === undefined || result == null || result === '0x') {
      return false
    }
    try {
      var decoded = iface.decodeFunctionResult('supportsInterface', result)
      if (
        decoded !== undefined &&
        decoded !== null &&
        Array.isArray(decoded) &&
        decoded.length > 0
      ) {
        return decoded[0]
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    return false
  }

  EnsLibrary.prototype.getContentHash = async function (domain, web3) {
    domain =
      domain === undefined || domain == null || domain.trim() === ''
        ? null
        : domain.trim()
    if (domain == null) {
      throw new Error('Undefined ENS domain...')
    }
    if (web3 === undefined) {
      var { web3 } = await this.getWeb3Provider()
    }
    // Resolve domain as namehash
    const domainHash = root.ethers.utils.namehash(domain)
    // Fetch ens registry address
    const { chainId, registry } = await this.getRegistry(web3)
    this.getLogger().info(
      `ENS registry:
 ${this.etherscan[chainId]}/address/${registry}`
    )
    // Fetch resolver address
    var resolver = await this.getResolver(web3, registry, domainHash)
    // Check
    if (resolver == null || /^0x0+$/.test(resolver) === true) {
      throw new Error('Undefined ENS domain resolver...')
    }
    // Log
    this.getLogger().info(
      `ENS domain resolver:
 ${this.etherscan[chainId]}/address/${resolver}`
    )
    // Check if resolver is EIP165
    const eip165 = await this.checkEip165(web3, resolver)
    if (eip165 === false) {
      throw new Error('ENS domain resolver do not conform to EIP165...')
    }
    // Check if resolver is EIP1577
    const eip1577 = await this.checkEip1577(web3, resolver)
    if (eip1577 === false) {
      throw new Error('ENS domain resolver do not conform to EIP1577...')
    }
    // Retrieve content hash
    this.getLogger().info('Processing ENS domain content...')
    const abi = [
      'function contenthash(bytes32 node) external view returns (bytes memory)'
    ]
    const iface = new root.ethers.utils.Interface(abi)
    const data = iface.encodeFunctionData('contenthash', [domainHash])
    const result = await web3.call({ to: resolver, data: data })
    if (result === undefined || result == null || result === '0x') {
      return {
        content: null,
        protocol: null
      }
    }
    var content = iface.decodeFunctionResult('contenthash', result)
    if (
      content !== undefined &&
      content !== null &&
      Array.isArray(content) &&
      content.length > 0
    ) {
      var { decoded, protocol } = this.decodeContenthash(content[0])
      return {
        content: decoded,
        protocol: protocol
      }
    }
    return {
      content: null,
      protocol: null
    }
  }

  EnsLibrary.prototype.isOwner = async function (domain, web3, account) {
    domain =
      domain === undefined || domain == null || domain.trim() === ''
        ? null
        : domain.trim()
    if (domain == null) {
      throw new Error('Undefined ENS domain...')
    }
    if (
      account === undefined ||
      account == null ||
      web3 === undefined ||
      web3 == null
    ) {
      var { account, web3 } = await this.getEnabledWeb3Provider()
    }
    // Resolve domain as namehash
    const domainHash = root.ethers.utils.namehash(domain)
    // Fetch ens registry address
    const { chainId, registry } = await this.getRegistry(web3)
    this.getLogger().info(
      `ENS registry:
 ${this.etherscan[chainId]}/address/${registry}`
    )
    const abi = ['function owner(bytes32 node) public view returns(address)']
    const iface = new root.ethers.utils.Interface(abi)
    const data = iface.encodeFunctionData('owner', [domainHash])
    const result = await web3.call({ to: registry, data: data })
    if (result === undefined || result == null || result === '0x') {
      return false
    }
    // decode if applicable
    try {
      var decoded = iface.decodeFunctionResult('owner', result)
      if (
        decoded !== undefined &&
        decoded !== null &&
        Array.isArray(decoded) &&
        decoded.length > 0
      ) {
        return decoded[0].toLowerCase() === account.toLowerCase()
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    return false
  }

  EnsLibrary.prototype.setContentHash = async function (
    domain,
    cid,
    web3,
    account
  ) {
    cid =
      cid === undefined || cid == null || cid.toString().trim() === ''
        ? null
        : cid.toString().trim()
    if (cid == null) {
      throw new Error('Undefined IPFS identifier...')
    }
    domain =
      domain === undefined || domain == null || domain.trim() === ''
        ? null
        : domain.trim()
    if (domain == null) {
      throw new Error('Undefined ENS domain...')
    }
    if (account === undefined || web3 === undefined) {
      var { account, web3 } = await this.getEnabledWeb3Provider()
    }
    // Resolve domain as namehash
    const domainHash = root.ethers.utils.namehash(domain)
    // Fetch ens registry address
    const { chainId, registry } = await this.getRegistry(web3)
    this.getLogger().info(
      `ENS registry:
 ${this.etherscan[chainId]}/address/${registry}`
    )
    var resolver = await this.getResolver(web3, registry, domainHash)
    if (resolver == null || /^0x0+$/.test(resolver) === true) {
      throw new Error('Undefined ENS resolver...')
    }
    this.getLogger().info(
      `ENS domain resolver:
 ${this.etherscan[chainId]}/address/${resolver}`
    )
    // Check if resolver is EIP165
    const eip165 = await this.checkEip165(web3, resolver)
    if (eip165 === false) {
      throw new Error('ENS resolver do not conform to EIP165...')
    }
    // Check if resolver is EIP1577
    const eip1577 = await this.checkEip1577(web3, resolver)
    if (eip1577 === false) {
      throw new Error('ENS resolver do not conform to EIP1577...')
    }
    // Encode cid
    const { encoded } = this.encodeContenthash('ipfs://' + cid)
    // Set Contenthash
    this.getLogger().info('Processing ENS domain content...')
    const abi = ['function setContenthash(bytes32 node, bytes calldata hash)']
    const iface = new root.ethers.utils.Interface(abi)
    const data = iface.encodeFunctionData('setContenthash', [
      domainHash,
      encoded
    ])
    try {
      this.getLogger().info('Before get Signer...')
      const signer = web3.getSigner()
      this.getLogger().info('Got Signer...')
      const tx = await signer.sendTransaction({ to: resolver, data: data })
      this.getLogger().info(
        `Processing Transaction:
 ${this.etherscan[chainId]}/tx/${tx.hash}`
      )
      this.getLogger().info('Transaction sent...')
      // Wait for transaction completion
      await tx.wait()
      this.getLogger().info('Processed ENS domain content...')
    } catch (error) {
      // EIP 1193 user Rejected Request
      if (error.code === 4001) {
        const err = new Error('Rejected User Request...')
        err.name = 'RejectedUserRequest'
        this.getLogger().error(error)
        throw err
      }
      if (error.code === 4100) {
        const err = new Error('Unauthorized User Account...')
        err.name = 'UnauthorizedUserAccount'
        this.getLogger().error(error)
        throw err
      }
      throw error
    }
  }

  module.exports = EnsLibrary
})()
