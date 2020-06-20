/*\
title: $:/plugins/ipfs/ens-wrapper.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

ENS Wrapper

\*/

;(function () {
  /*jslint node: true, browser: true */
  /*global $tw: false */
  'use strict'

  /*eslint no-unused-vars: "off"*/
  const name = 'ens-wrapper'

  var EnsWrapper = function (ipfsBundle) {
    this.account = null
    this.chainId = null
    this.provider = null
    this.web3 = null
    this.boxLibrary = ipfsBundle.boxLibrary
    this.ensLibrary = ipfsBundle.ensLibrary
    this.ipfsBundle = ipfsBundle
  }

  EnsWrapper.prototype.getLogger = function () {
    if (window.logger !== undefined && window.logger !== null) {
      return window.logger
    }
    return console
  }

  EnsWrapper.prototype.load3Box = async function () {
    const { account, provider } = await this.getEnabledWeb3Provider()
    await this.boxLibrary.load3Box(provider, account)
    return {
      account: account
    }
  }

  EnsWrapper.prototype.getChainId = function () {
    return this.chainId
  }

  /*
   * https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
   * https://eips.ethereum.org/EIPS/eip-1193
   */
  EnsWrapper.prototype.getEthereumProvider = function () {
    if (this.provider === null) {
      const self = this
      this.provider = this.ensLibrary.getProvider()
      this.provider.on('accountsChanged', accounts => {
        self.accountChanged(accounts)
      })
      this.provider.on('chainChanged', chainId => {
        self.chainChanged(chainId)
      })
      this.provider.on('connect', chainId => {
        self.chainChanged(chainId)
      })
      this.provider.on('disconnect', (code, reason) => {
        self.disconnectedFromAllChains(code, reason)
      })
      this.provider.on('message', message => {
        self.providerMessage(message)
      })
    }
    return this.provider
  }

  EnsWrapper.prototype.accountChanged = async function (accounts) {
    if (
      accounts === undefined ||
      accounts == null ||
      Array.isArray(accounts) === false ||
      accounts.length === 0
    ) {
      this.account = null
      this.chainId = null
      this.web3 = null
      this.getLogger().info('Closing Ethereum connection...')
    } else if (this.account !== accounts[0]) {
      try {
        if (this.web3 == null && this.chainId == null) {
          const { web3, chainId } = await this.getWeb3Provider()
          this.web3 = web3
          this.chainId = chainId
        }
        this.account = accounts[0]
        const etherscan = this.getEtherscanRegistry()
        this.getLogger().info(
          `Current Ethereum account:\n ${etherscan[this.chainId]}/address/${
            this.account
          }`
        )
      } catch (error) {
        this.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      }
    }
  }

  EnsWrapper.prototype.disconnectedFromAllChains = function (code, reason) {
    this.account = null
    this.chainId = null
    this.web3 = null
    this.getLogger().info(
      `Ethereum Provider is disconnected: ${reason}. Code: ${code}`
    )
  }

  EnsWrapper.prototype.providerMessage = function (message) {
    this.getLogger().info(`Ethereum Provider message: ${message}`)
  }

  EnsWrapper.prototype.chainChanged = function (chainId) {
    if (this.chainId !== chainId) {
      const network = this.getNetworkRegistry()
      try {
        this.account = null
        this.chainId = parseInt(chainId, 16)
        this.web3 = null
        this.getLogger().info(
          `Current Ethereum network: ${network[this.chainId]}`
        )
      } catch (error) {
        this.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      }
    }
  }

  EnsWrapper.prototype.getEnabledWeb3Provider = async function () {
    var web3 = null
    var chainId = null
    var account = null
    const provider = this.getEthereumProvider()
    const network = this.getNetworkRegistry()
    const etherscan = this.getEtherscanRegistry()
    var msg = 'Reuse Web3 provider:'
    if (this.account == null) {
      try {
        var {
          web3,
          chainId,
          account
        } = await this.ensLibrary.getEnabledWeb3Provider(provider)
      } catch (error) {
        if (error.name === 'UserRejectedRequest') {
          throw error
        }
        this.getLogger().error(error)
        throw new Error('Unable to retrieve an enabled Ethereum Provider...')
      }
      this.account = account
      this.chainId = chainId
      this.web3 = web3
      msg = 'New Web3 provider:'
    }
    // Log
    this.getLogger().info(
      `${msg}\n network: ${network[this.chainId]}\n account: ${
        etherscan[this.chainId]
      }/address/${this.account}`
    )
    return {
      account: this.account,
      chainId: this.chainId,
      provider: provider,
      web3: this.web3
    }
  }

  EnsWrapper.prototype.getWeb3Provider = async function () {
    var chainId = null
    var web3 = null
    const provider = this.getEthereumProvider()
    const network = this.getNetworkRegistry()
    var info = 'Reuse Web3 provider:'
    if (this.web3 == null) {
      try {
        var { web3, chainId } = await this.ensLibrary.getWeb3Provider(provider)
      } catch (error) {
        this.getLogger().error(error)
        throw new Error('Unable to retrieve an Ethereum Provider...')
      }
      this.chainId = chainId
      this.web3 = web3
      info = 'New Web3 provider:'
    }
    // Log
    this.getLogger().info(`${info}\n network: ${network[this.chainId]}`)
    return {
      chainId: this.chainId,
      provider: provider,
      web3: this.web3
    }
  }

  EnsWrapper.prototype.getContentHash = async function (domain, web3) {
    try {
      var { content, protocol } = await this.ensLibrary.getContentHash(
        domain,
        web3
      )
      if (content !== null && protocol !== null) {
        // Convert CidV0 to CidV1
        content = this.ipfsBundle.cidV0ToCidV1(content)
        // Success
        return {
          content: content,
          protocol: protocol
        }
      }
      $tw.utils.alert(name, 'Unassigned ENS domain content...')
      return {
        content: null,
        protocol: null
      }
    } catch (error) {
      this.getLogger().error(error)
      throw new Error('Unable to fetch ENS domain content...')
    }
  }

  EnsWrapper.prototype.setContentHash = async function (
    domain,
    cid,
    web3,
    account
  ) {
    try {
      const isOwner = await this.ensLibrary.isOwner(domain, web3, account)
      if (isOwner === false) {
        const err = new Error('Unauthorized Account...')
        err.name = 'OwnerError'
        throw err
      }
      const cidV0 = this.ipfsBundle.cidV1ToCidV0(cid)
      await this.ensLibrary.setContentHash(domain, cidV0, web3, account)
      return {
        cidV0: cidV0
      }
    } catch (error) {
      if (
        error.name === 'OwnerError' ||
        error.name === 'RejectedUserRequest' ||
        error.name === 'UnauthorizedUserAccount'
      ) {
        throw error
      }
      this.getLogger().error(error)
      throw new Error('Unable to set ENS domain content...')
    }
  }

  EnsWrapper.prototype.getEtherscanRegistry = function () {
    return this.ensLibrary.getEtherscanRegistry()
  }

  EnsWrapper.prototype.getNetworkRegistry = function () {
    return this.ensLibrary.getNetworkRegistry()
  }

  EnsWrapper.prototype.getENSRegistry = function () {
    return this.ensLibrary.getENSRegistry()
  }

  exports.EnsWrapper = EnsWrapper
})()
