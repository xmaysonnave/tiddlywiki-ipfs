import root from 'window-or-global'
import detectEthereumProvider from '@metamask/detect-provider'
;(function () {
  'use strict'

  /*eslint no-unused-vars:"off"*/
  const name = 'ethereum-library'

  // https://github.com/ensdomains/resolvers
  var EthereumLibrary = function (ipfsLoader) {
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
    this.once = false
    this.provider = null
  }

  EthereumLibrary.prototype.getLogger = function () {
    if (root.logger !== undefined && root.logger !== null) {
      return root.logger
    }
    return console
  }

  EthereumLibrary.prototype.getEthereumProvider = async function () {
    if (this.provider == null) {
      this.provider = await this.detectEthereumProvider()
    }
    return this.provider
  }

  /*
   * https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
   * https://eips.ethereum.org/EIPS/eip-1193
   * https://docs.metamask.io/guide/ethereum-provider.html#methods-current-api
   */
  EthereumLibrary.prototype.init = async function () {
    // Init once
    if (this.once) {
      return
    }
    const self = this
    try {
      const provider = await this.getEthereumProvider()
      // Current network
      const chainId = await this.provider.request({
        method: 'eth_chainId'
      })
      this.chainChanged(chainId)
      // Init Ethereum listener
      provider.on('accountsChanged', accounts => {
        self.accountChanged(accounts)
      })
      provider.on('chainChanged', chainId => {
        self.chainChanged(chainId)
      })
      provider.on('connect', chainId => {
        self.chainChanged(chainId)
      })
      provider.on('disconnect', (code, reason) => {
        self.disconnectedFromAllChains(code, reason)
      })
      provider.on('message', message => {
        self.providerMessage(message)
      })
    } catch (error) {
      this.getLogger().error(error)
    }
    // Init once
    this.once = true
  }

  EthereumLibrary.prototype.accountChanged = async function (accounts) {
    if (
      accounts !== undefined &&
      accounts !== null &&
      Array.isArray(accounts) === true &&
      accounts.length > 0
    ) {
      try {
        const { chainId } = await this.getWeb3Provider()
        this.getLogger().info('Available Ethereum account:')
        for (var i = 0; i < accounts.length; i++) {
          const account = accounts[i]
          this.getLogger().info(
            ` ${this.etherscan[chainId]}/address/${account}`
          )
        }
      } catch (error) {
        this.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      }
    } else {
      this.getLogger().info('No available Ethereum account...')
    }
  }

  EthereumLibrary.prototype.disconnectedFromAllChains = function (
    code,
    reason
  ) {
    this.getLogger().info(
      `Ethereum Provider is disconnected: ${reason}. Code: ${code}`
    )
  }

  EthereumLibrary.prototype.providerMessage = function (message) {
    this.getLogger().info(`Ethereum Provider message: ${message}`)
  }

  EthereumLibrary.prototype.chainChanged = function (chainId) {
    try {
      var chainId = parseInt(chainId, 16)
      this.getLogger().info(`Chain: ${this.network[chainId]}`)
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
    }
  }

  EthereumLibrary.prototype.getEtherscanRegistry = function () {
    return this.etherscan
  }

  EthereumLibrary.prototype.getNetworkRegistry = function () {
    return this.network
  }

  EthereumLibrary.prototype.loadEthers = async function () {
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

  EthereumLibrary.prototype.decrypt = async function (text, provider) {
    if (provider === undefined || provider == null) {
      provider = await this.getEthereumProvider()
    }
    const account = await this.getAccount(provider)
    var tStart = new Date()
    const outputText = await provider.request({
      method: 'eth_decrypt',
      params: [text, account]
    })
    if (outputText !== undefined || outputText !== null) {
      var tStop = new Date() - tStart
      var ratio = Math.floor((outputText.length * 100) / text.length)
      this.getLogger().info(
        `Ethereum Decrypt: ${tStop}ms, In: ${text.length}, Out: ${outputText.length}, Ratio: ${ratio}%`
      )
    }
    return outputText
  }

  EthereumLibrary.prototype.getPublicEncryptionKey = async function (
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
   * https://eips.ethereum.org/EIPS/eip-1102
   * https://eips.ethereum.org/EIPS/eip-1193
   * https://eips.ethereum.org/EIPS/eip-2255
   * https://docs.metamask.io/guide/ethereum-provider.html#methods-current-api
   */
  EthereumLibrary.prototype.detectEthereumProvider = async function () {
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

  EthereumLibrary.prototype.checkAccountPermission = async function (provider) {
    if (provider === undefined || provider == null) {
      provider = await this.getEthereumProvider()
    }
    const permissions = await provider.request({
      method: 'wallet_getPermissions'
    })
    const accountsPermission = permissions.find(
      permission => permission.parentCapability === 'eth_accounts'
    )
    if (accountsPermission) {
      return true
    }
    return false
  }

  EthereumLibrary.prototype.requestAccountPermission = async function (
    provider
  ) {
    if (provider === undefined || provider == null) {
      provider = await this.getEthereumProvider()
    }
    const permissions = await provider.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }]
    })
    const accountsPermission = permissions.find(
      permission => permission.parentCapability === 'eth_accounts'
    )
    if (accountsPermission) {
      return true
    }
    return false
  }

  /*
   * https://docs.metamask.io/guide/provider-migration.html#migrating-to-the-new-provider-api
   */
  EthereumLibrary.prototype.getAccount = async function (provider) {
    if (provider === undefined || provider == null) {
      provider = await this.getEthereumProvider()
    }
    try {
      var permission = false
      var accounts = null
      try {
        permission = await this.checkAccountPermission(provider)
        if (permission === false) {
          permission = await this.requestAccountPermission(provider)
        }
      } catch (error) {
        if (error.code === 4001) {
          throw error
        }
        this.getLogger().error(error)
      }
      if (
        permission === false ||
        (await provider._metamask.isUnlocked()) === false
      ) {
        // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1102.md
        await provider.request({ method: 'eth_requestAccounts' })
      }
      // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
      accounts = await provider.request({ method: 'eth_accounts' })
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
        throw err
      }
      throw error
    }
  }

  EthereumLibrary.prototype.getEnabledWeb3Provider = async function (provider) {
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

  EthereumLibrary.prototype.getWeb3Provider = async function (provider) {
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

  module.exports = EthereumLibrary
})()
