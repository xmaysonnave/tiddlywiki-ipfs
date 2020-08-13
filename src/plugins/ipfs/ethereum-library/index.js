import root from 'window-or-global'
;(function () {
  'use strict'

  /*eslint no-unused-vars:"off"*/
  const name = 'ethereum-library'

  // https://github.com/ensdomains/resolvers
  var EthereumLibrary = function (ipfsBundle) {
    this.ipfsBundle = ipfsBundle
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
    return this.ipfsBundle.getLogger()
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
      const chainId = await this.getChainId(provider)
      this.getLogger().info(`Chain: ${this.network[chainId]}`)
      // Init Ethereum listener
      provider.on('accountsChanged', accounts => {
        self.accounts(provider, accounts)
      })
      provider.on('chainChanged', chainId => {
        const id = parseInt(chainId, 16)
        self.getLogger().info(`Chain: ${self.network[id]}`)
      })
      provider.on('connect', chainId => {
        const id = parseInt(chainId, 16)
        self.getLogger().info(`Chain: ${self.network[id]}`)
      })
      provider.on('disconnect', (code, reason) => {
        self.disconnectedFromAllChains(code, reason)
      })
      provider.on('message', message => {
        self.providerMessage(message)
      })
    } catch (error) {
      if (error.name !== 'InstallMetamask') {
        this.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      }
    }
    // Init once
    this.once = true
  }

  EthereumLibrary.prototype.getChainId = async function (provider) {
    if (provider === undefined || provider == null) {
      provider = await this.getEthereumProvider()
    }
    var chainId = await provider.request({
      method: 'eth_chainId'
    })
    chainId =
      chainId === undefined || chainId == null || chainId.trim() === ''
        ? null
        : chainId.trim()
    return chainId !== null ? parseInt(chainId, 16) : null
  }

  EthereumLibrary.prototype.accounts = async function (provider, accounts) {
    if (
      accounts !== undefined &&
      accounts !== null &&
      Array.isArray(accounts) === true &&
      accounts.length > 0
    ) {
      try {
        const chainId = await this.getChainId(provider)
        this.getLogger().info(`Chain: ${this.network[chainId]}`)
        this.getLogger().info(
          `Ethereum account: ${this.etherscan[chainId]}/address/${accounts[0]}`
        )
      } catch (error) {
        this.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      }
    } else {
      this.getLogger().info('Unavailable Ethereum account...')
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

  EthereumLibrary.prototype.getEtherscanRegistry = function () {
    return this.etherscan
  }

  EthereumLibrary.prototype.getNetworkRegistry = function () {
    return this.network
  }

  EthereumLibrary.prototype.keccak256 = async function (text) {
    text =
      text === undefined || text == null || text.trim() === ''
        ? null
        : text.trim()
    if (text == null) {
      throw new Error('Undefined Text....')
    }
    if (root.ethers === undefined || root.ethers == null) {
      await this.ipfsBundle.loadEthersJsLibrary()
    }
    return root.ethers.utils.keccak256(root.ethers.utils.toUtf8Bytes(text))
  }

  EthereumLibrary.prototype.personalSign = async function (message, provider) {
    message =
      message === undefined || message == null || message.trim() === ''
        ? null
        : message.trim()
    if (message == null) {
      throw new Error('Undefined Message....')
    }
    try {
      if (provider === undefined || provider == null) {
        provider = await this.getEthereumProvider()
      }
      const account = await this.getAccount(provider)
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, account]
      })
      return signature
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

  EthereumLibrary.prototype.personalRecover = function (message, signature) {
    message =
      message === undefined || message == null || message.trim() === ''
        ? null
        : message.trim()
    if (message == null) {
      throw new Error('Undefined Message....')
    }
    signature =
      signature === undefined || signature == null || signature.trim() === ''
        ? null
        : signature.trim()
    if (signature == null) {
      throw new Error('Undefined Signature....')
    }
    const msgParams = { data: message, sig: signature }
    const recovered = root.sigUtil.recoverPersonalSignature(msgParams)
    return recovered !== undefined && recovered !== null ? recovered : null
  }

  EthereumLibrary.prototype.decrypt = async function (text, provider) {
    text =
      text === undefined || text == null || text.trim() === ''
        ? null
        : text.trim()
    if (text == null) {
      throw new Error('Undefined Text....')
    }
    try {
      if (provider === undefined || provider == null) {
        provider = await this.getEthereumProvider()
      }
      const account = await this.getAccount(provider)
      var tStart = new Date()
      const decryptedText = await provider.request({
        method: 'eth_decrypt',
        params: [text, account]
      })
      if (decryptedText !== undefined || decryptedText !== null) {
        var tStop = new Date() - tStart
        var ratio = Math.floor((decryptedText.length * 100) / text.length)
        this.getLogger().info(
          `Ethereum Decrypt: ${tStop}ms, In: ${text.length}, Out: ${decryptedText.length}, Ratio: ${ratio}%`
        )
      }
      return decryptedText
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
        throw err
      }
      throw error
    }
  }

  /*
   * https://eips.ethereum.org/EIPS/eip-1102
   * https://eips.ethereum.org/EIPS/eip-1193
   * https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
   * https://eips.ethereum.org/EIPS/eip-2255
   * https://docs.metamask.io/guide/ethereum-provider.html#methods-current-api
   */
  EthereumLibrary.prototype.detectEthereumProvider = async function () {
    var provider = null
    try {
      if (typeof root.detectEthereumProvider === 'function') {
        provider = await root.detectEthereumProvider({ mustBeMetaMask: true })
        if (provider !== undefined && provider !== null) {
          provider.autoRefreshOnNetworkChange = false
        }
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    if (provider === undefined || provider == null) {
      const err = new Error('Please install ~MetaMask...')
      err.name = 'InstallMetamask'
      throw err
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
      var accounts = null
      if (typeof provider.request === 'function') {
        var permission = false
        // Permission Attempt
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
        // Request Accounts attempt
        try {
          if (
            permission === false ||
            (await provider._metamask.isUnlocked()) === false
          ) {
            // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1102.md
            accounts = await provider.request({ method: 'eth_requestAccounts' })
          }
          if (
            accounts === undefined ||
            accounts == null ||
            Array.isArray(accounts) === false ||
            accounts.length === 0
          ) {
            // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
            accounts = await provider.request({ method: 'eth_accounts' })
          }
        } catch (error) {
          if (error.code === 4001) {
            throw error
          }
          this.getLogger().error(error)
        }
      }
      // Enable attempt
      if (
        accounts === undefined ||
        accounts == null ||
        Array.isArray(accounts) === false ||
        accounts.length === 0
      ) {
        if (typeof provider.enable === 'function') {
          accounts = await provider.enable()
        }
      }
      if (
        accounts === undefined ||
        accounts == null ||
        Array.isArray(accounts) === false ||
        accounts.length === 0
      ) {
        throw new Error('Unable to retrieve any Ethereum accounts...')
      }
      await this.accounts(provider, accounts)
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
      await this.ipfsBundle.loadEthersJsLibrary()
    }
    // Enable provider
    // https://github.com/ethers-io/ethers.js/issues/433
    const account = await this.getAccount(provider)
    // Instantiate a Web3Provider
    const web3 = new root.ethers.providers.Web3Provider(provider, 'any')
    // Retrieve current network
    const network = await web3.getNetwork()
    const chainId = parseInt(network.chainId, 16)
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
      await this.ipfsBundle.loadEthersJsLibrary()
    }
    // Instantiate an ethers Web3Provider
    const web3 = new root.ethers.providers.Web3Provider(provider, 'any')
    // Retrieve current network
    const network = await web3.getNetwork()
    const chainId = parseInt(network.chainId, 16)
    return {
      web3: web3,
      chainId: chainId
    }
  }

  module.exports = EthereumLibrary
})()
