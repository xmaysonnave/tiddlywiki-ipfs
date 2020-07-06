/*\
title: $:/plugins/ipfs/ens-wrapper.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

ENS Wrapper

\*/

;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  /*eslint no-unused-vars:"off"*/
  const name = 'ens-wrapper'

  var EnsWrapper = function (ipfsBundle) {
    this.provider = null
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
    await this.boxLibrary.load3Box(account, provider)
    return {
      account: account
    }
  }

  EnsWrapper.prototype.getPublicEncryptionKey = async function (provider) {
    try {
      return await this.ensLibrary.getPublicEncryptionKey(provider)
    } catch (error) {
      if (error.name === 'RejectedUserRequest') {
        throw error
      }
      this.getLogger().error(error)
      throw new Error('Unable to retrieve an Ethereum Public Encryption Key...')
    }
  }

  /*
   * https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1193.md
   * https://eips.ethereum.org/EIPS/eip-1193
   * https://docs.metamask.io/guide/ethereum-provider.html#methods-current-api
   */
  EnsWrapper.prototype.getEthereumProvider = async function () {
    if (this.provider === null) {
      const self = this
      // Retrieve Ethereum Provider
      this.provider = await this.ensLibrary.getEthereumProvider()
      // Current network
      const chainId = await this.provider.request({
        method: 'eth_chainId'
      })
      this.chainChanged(chainId)
      // Init Ethereum listener
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
      accounts !== undefined &&
      accounts !== null &&
      Array.isArray(accounts) === true &&
      accounts.length > 0
    ) {
      try {
        const { chainId } = await this.getWeb3Provider()
        const account = accounts[0]
        const etherscan = this.getEtherscanRegistry()
        this.getLogger().info(
          `Account: ${etherscan[chainId]}/address/${account}`
        )
      } catch (error) {
        this.getLogger().error(error)
        $tw.utils.alert(name, error.message)
      }
    }
  }

  EnsWrapper.prototype.disconnectedFromAllChains = function (code, reason) {
    this.getLogger().info(
      `Ethereum Provider is disconnected: ${reason}. Code: ${code}`
    )
  }

  EnsWrapper.prototype.providerMessage = function (message) {
    this.getLogger().info(`Ethereum Provider message: ${message}`)
  }

  EnsWrapper.prototype.chainChanged = function (chainId) {
    const network = this.getNetworkRegistry()
    try {
      var chainId = parseInt(chainId, 16)
      this.getLogger().info(`Chain: ${network[chainId]}`)
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, error.message)
    }
  }

  EnsWrapper.prototype.isOwner = async function (domain, web3, account) {
    return await this.ensLibrary.isOwner(domain, web3, account)
  }

  EnsWrapper.prototype.getEnabledWeb3Provider = async function () {
    var account = null
    var chainId = null
    var web3 = null
    const etherscan = this.getEtherscanRegistry()
    const network = this.getNetworkRegistry()
    const provider = await this.getEthereumProvider()
    try {
      var {
        account,
        chainId,
        web3
      } = await this.ensLibrary.getEnabledWeb3Provider(provider)
    } catch (error) {
      if (error.name === 'RejectedUserRequest') {
        throw error
      }
      this.getLogger().error(error)
      throw new Error('Unable to retrieve an enabled Ethereum Provider...')
    }
    // Log
    this.getLogger().info(
      `New Enabled Web3 provider:
 Chain: ${network[chainId]}
 Account: ${etherscan[chainId]}/address/${account}`
    )
    return {
      account: account,
      chainId: chainId,
      provider: provider,
      web3: web3
    }
  }

  EnsWrapper.prototype.getWeb3Provider = async function () {
    var chainId = null
    var web3 = null
    const network = this.getNetworkRegistry()
    const provider = await this.getEthereumProvider()
    try {
      var { web3, chainId } = await this.ensLibrary.getWeb3Provider(provider)
    } catch (error) {
      this.getLogger().error(error)
      throw new Error('Unable to retrieve an Ethereum Provider...')
    }
    // Log
    this.getLogger().info(
      `New Web3 provider:
 ${network[chainId]}`
    )
    return {
      chainId: chainId,
      provider: provider,
      web3: web3
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
      const isOwner = await this.isOwner(domain, web3, account)
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
