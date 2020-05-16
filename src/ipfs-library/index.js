import { getIpfs, providers } from 'ipfs-provider'
import root from 'window-or-global'
;(function () {
  /*jslint node: true, browser: true */
  'use strict'

  const name = 'ipfs-library'

  const empty =
    '/ipfs/bafybeiczsscdsbs7ffqz55asqdf3smv6klcw3gofszvwlyarci47bgf354'

  /*
   * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
   **/
  var IpfsLibrary = function (ipfsBundle) {
    this.ipfsBundle = ipfsBundle
    this.ipfsLoader = ipfsBundle.ipfsLoader
  }

  IpfsLibrary.prototype.getLogger = function () {
    return root.log.getLogger(name)
  }

  IpfsLibrary.prototype.loadIpfsHttpClient = async function () {
    const self = this
    if (typeof root.IpfsHttpClient === 'undefined') {
      try {
        // Load js-ipfs-http-client
        await this.ipfsLoader.loadIpfsHttpLibrary()
        if (typeof root.IpfsHttpClient !== 'undefined') {
          return
        }
      } catch (error) {
        self.getLogger().error(error)
      }
      // Should not happen...
      throw new Error('Unavailable IPFS HTTP Client library...')
    }
  }

  // Default
  IpfsLibrary.prototype.getDefaultIpfs = async function (apiUrl) {
    // IPFS Companion first
    try {
      const { ipfs, provider } = await this.getWindowIpfs()
      if (ipfs !== null) {
        return {
          ipfs: ipfs,
          provider: provider
        }
      }
    } catch (error) {
      // IPFS Companion failed
    }
    if (apiUrl == undefined || apiUrl == null || apiUrl.href === '') {
      throw new Error('Undefined IPFS API URL...')
    }
    // Load IpfsHttpClient
    try {
      const { ipfs, provider } = await this.getHttpIpfs(apiUrl.href)
      if (ipfs !== null) {
        return {
          ipfs: ipfs,
          provider: provider
        }
      }
    } catch (error) {
      // IPFS HTTP client failed
    }
    throw new Error('Unable to retrieve IPFS Companion and IPFS API URL...')
  }

  // IPFS companion
  IpfsLibrary.prototype.getWindowIpfs = async function () {
    const self = this
    try {
      const { windowIpfs } = providers
      this.getLogger().info('Processing connection to IPFS Companion...')
      const { ipfs, provider } = await getIpfs({
        providers: [windowIpfs()]
      })
      return {
        ipfs: ipfs,
        provider: provider
      }
    } catch (error) {
      self.getLogger().error(error)
    }
    throw new Error('Unreachable IPFS Companion...')
  }

  // ipfs-http-client
  IpfsLibrary.prototype.getHttpIpfs = async function (url) {
    if (url == undefined || url == null || url.toString() === '') {
      throw new Error('Undefined IPFS API URL...')
    }
    try {
      // Load IpfsHttpClient
      if (typeof root.IpfsHttpClient === 'undefined') {
        await this.loadIpfsHttpClient()
      }
      // Instantiate client
      const { httpClient } = providers
      this.getLogger().info(`Processing connection to IPFS API URL:\n ${url}`)
      const { ipfs, provider } = await getIpfs({
        providers: [
          httpClient({
            timeout: '2m',
            apiAddress: url.toString()
          })
        ]
      })
      return {
        ipfs: ipfs,
        provider: provider + ', ' + url.toString()
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Unreachable IPFS API URL...')
  }

  IpfsLibrary.prototype.add = async function (client, content) {
    if (client == undefined || client == null) {
      throw new Error('Undefined IPFS provider...')
    }
    if (content == undefined || content == null) {
      throw new Error('Undefined content...')
    }
    // Window IPFS policy
    if (client.enable) {
      client = await client.enable({ commands: ['add'] })
    }
    // Process
    if (client !== undefined && client.add !== undefined) {
      // Process
      var buffer = Buffer.from(content)
      this.getLogger().info('Processing IPFS add...')
      // 1 - https://github.com/ipfs/go-ipfs/issues/5683
      // default chunker: "size-262144"
      // chunker: "rabin-262144-524288-1048576"
      // 2 - TODO: small content generates a wrong cid when cidVersion: 1 is set:
      // Not a 'dag-pb' but a 'raw' multicodec instead
      // We generate a V0 and convert it to a V1
      // https://github.com/xmaysonnave/tiddlywiki-ipfs/issues/14
      const addSource = await client.add(buffer, {
        cidVersion: 0,
        hashAlg: 'sha2-256',
        chunker: 'rabin-262144-524288-1048576',
        pin: false
      })
      // https://gist.github.com/alanshaw/04b2ddc35a6fff25c040c011ac6acf26
      var lastResult = null
      for await (const added of addSource) {
        lastResult = added
      }
      // Check
      if (
        lastResult == null ||
        lastResult.path == undefined ||
        lastResult.path == null
      ) {
        throw new Error('IPFS client returned an unknown result...')
      }
      return {
        hash: this.ipfsBundle.cidV0ToCidV1(lastResult.path),
        size: lastResult.size
      }
    }
    throw new Error('Undefined IPFS command add...')
  }

  IpfsLibrary.prototype.pin = async function (client, cid) {
    if (client == undefined || client == null) {
      throw new Error('Undefined IPFS provider...')
    }
    cid =
      cid == null || cid == undefined || cid.trim() === '' ? null : cid.trim()
    if (cid == null) {
      throw new Error('Undefined IPFS identifier...')
    }
    // Window IPFS policy
    if (client.enable) {
      client = await client.enable({ commands: ['pin'] })
    }
    // Process
    if (
      client !== undefined &&
      client.pin !== undefined &&
      client.pin.add !== undefined
    ) {
      this.getLogger().info('Processing IPFS pin add...')
      const result = await client.pin.add(cid, {
        recursive: true
      })
      return result
    }
    throw new Error('Undefined IPFS pin add...')
  }

  IpfsLibrary.prototype.unpin = async function (client, cid) {
    if (client == undefined || client == null) {
      throw new Error('Undefined IPFS provider...')
    }
    cid =
      cid == null || cid == undefined || cid.trim() === '' ? null : cid.trim()
    if (cid == null) {
      throw new Error('Undefined IPFS identifier...')
    }
    // Window IPFS policy
    if (client.enable) {
      client = await client.enable({ commands: ['pin'] })
    }
    // Process
    if (
      client !== undefined &&
      client.pin !== undefined &&
      client.pin.rm !== undefined
    ) {
      this.getLogger().info('Processing IPFS pin rm...')
      const result = await client.pin.rm(cid, {
        recursive: true
      })
      return result
    }
    throw new Error('Undefined IPFS pin rm')
  }

  IpfsLibrary.prototype.publish = async function (client, ipnsName, cid) {
    if (client == undefined || client == null) {
      throw new Error('Undefined IPFS provider...')
    }
    cid =
      cid == null || cid == undefined || cid.trim() === '' ? null : cid.trim()
    if (cid == null) {
      throw new Error('Undefined IPFS identifier...')
    }
    ipnsName =
      ipnsName == null || ipnsName == undefined || ipnsName.trim() === ''
        ? null
        : ipnsName.trim()
    if (ipnsName == null) {
      throw new Error('Undefined IPNS name...')
    }
    // Window IPFS policy
    if (client.enable) {
      client = await client.enable({ commands: ['name'] })
    }
    if (
      client !== undefined &&
      client.name !== undefined &&
      client.name.publish !== undefined
    ) {
      this.getLogger().info('Processing IPNS name publish...')
      const result = await client.name.publish(cid, {
        resolve: true,
        key: ipnsName,
        allowOffline: false
      })
      if (result == undefined || result == null) {
        throw new Error('IPFS client returned an unknown result...')
      }
      return {
        name: result.name,
        value: result.value
      }
    }
    throw new Error('Undefined IPNS name publish...')
  }

  IpfsLibrary.prototype.resolve = async function (client, id) {
    if (client == undefined || client == null) {
      throw new Error('Undefined IPFS provider...')
    }
    id = id == null || id == undefined || id.trim() === '' ? null : id.trim()
    if (id == null) {
      throw new Error('Undefined IPNS key...')
    }
    // Window IPFS policy
    if (client.enable) {
      client = await client.enable({ commands: ['name'] })
    }
    if (
      client !== undefined &&
      client.name !== undefined &&
      client.name.resolve !== undefined
    ) {
      this.getLogger().info('Processing IPNS name resolve...')
      const resolvedSource = await client.name.resolve(id, {
        nocache: false,
        recursive: true
      })
      // https://gist.github.com/alanshaw/04b2ddc35a6fff25c040c011ac6acf26
      var lastResult = null
      for await (const resolved of resolvedSource) {
        lastResult = resolved
      }
      if (lastResult == null || lastResult == undefined) {
        throw new Error('IPFS client returned an unknown result...')
      }
      return lastResult
    }
    throw new Error('Undefined IPNS name resolve...')
  }

  IpfsLibrary.prototype.getKeys = async function (client) {
    if (client == undefined || client == null) {
      throw new Error('Undefined IPFS provider...')
    }
    // Window IPFS policy
    if (client.enable) {
      client = await client.enable({ commands: ['key'] })
    }
    if (
      client !== undefined &&
      client.key !== undefined &&
      client.key.list !== undefined
    ) {
      this.getLogger().info('Processing IPNS key list...')
      const result = await client.key.list()
      if (
        result == undefined ||
        result == null ||
        Array.isArray(result) == false
      ) {
        throw new Error('IPFS client returned an unknown result...')
      }
      return result
    }
    throw new Error('Undefined IPNS key list...')
  }

  // Only rsa is supported yet...
  // https://github.com/ipfs/interface-js-ipfs-core/blob/master/SPEC/KEY.md#keygen
  // https://github.com/libp2p/js-libp2p-crypto/issues/145
  IpfsLibrary.prototype.genKey = async function (client, ipnsName) {
    if (client == undefined || client == null) {
      throw new Error('Undefined IPFS provider...')
    }
    ipnsName =
      ipnsName == null || ipnsName == undefined || ipnsName.trim() === ''
        ? null
        : ipnsName.trim()
    if (ipnsName == null) {
      throw new Error('Undefined IPNS name...')
    }
    // Window IPFS policy
    if (client.enable) {
      client = await client.enable({ commands: ['key'] })
    }
    if (
      client !== undefined &&
      client.key !== undefined &&
      client.key.gen !== undefined
    ) {
      this.getLogger().info('Processing IPNS key gen...')
      const key = await client.key.gen(ipnsName, {
        type: 'rsa',
        size: 2048
      })
      if (
        key == undefined ||
        key == null ||
        key.id == undefined ||
        key.id == null
      ) {
        throw new Error('IPFS client returned an unknown result...')
      }
      return key.id
    }
    throw new Error('Undefined IPNS key gen...')
  }

  IpfsLibrary.prototype.rmKey = async function (client, ipnsName) {
    if (client == undefined || client == null) {
      throw new Error('Undefined IPFS provider...')
    }
    ipnsName =
      ipnsName == null || ipnsName == undefined || ipnsName.trim() === ''
        ? null
        : ipnsName.trim()
    if (ipnsName == null) {
      throw new Error('Undefined IPNS name...')
    }
    // Window IPFS policy
    if (client.enable) {
      client = await client.enable({ commands: ['key'] })
    }
    if (
      client !== undefined &&
      client.key !== undefined &&
      client.key.rm !== undefined
    ) {
      this.getLogger().info('Processing IPNS key rm...')
      const key = await client.key.rm(ipnsName)
      if (
        key == undefined ||
        key == null ||
        key.id == undefined ||
        key.id == null
      ) {
        throw new Error('IPFS client returned an unknown result...')
      }
      return key.id
    }
    throw new Error('Undefined IPNS key rm...')
  }

  IpfsLibrary.prototype.renameKey = async function (
    client,
    oldIpnsName,
    newIpnsName
  ) {
    if (client == undefined || client == null) {
      throw new Error('Undefined IPFS provider...')
    }
    oldIpnsName =
      oldIpnsName == null ||
      oldIpnsName == undefined ||
      oldIpnsName.trim() === ''
        ? null
        : oldIpnsName.trim()
    if (oldIpnsName == null) {
      throw new Error('Undefined Old IPNS name...')
    }
    newIpnsName =
      newIpnsName == null ||
      newIpnsName == undefined ||
      newIpnsName.trim() === ''
        ? null
        : newIpnsName.trim()
    if (newIpnsName == null) {
      throw new Error('Undefined New IPNS name...')
    }
    // Window IPFS policy
    if (client.enable) {
      client = await client.enable({ commands: ['key'] })
    }
    if (
      client !== undefined &&
      client.key !== undefined &&
      client.key.rename !== undefined
    ) {
      this.getLogger().info('Processing IPNS key rename...')
      const key = await client.key.rename(oldIpnsName, newIpnsName)
      if (key == undefined || key == null) {
        throw new Error('IPFS client returned an unknown result...')
      }
      var id = null
      if (key.id !== undefined && key.id !== null) {
        id = key.id
      }
      var was = null
      if (key.was !== undefined && key.was !== null) {
        was = key.was
      }
      var now = null
      if (key.now !== undefined && key.now !== null) {
        now = key.now
      }
      var overwrite = null
      if (key.overwrite !== undefined && key.overwrite !== null) {
        overwrite = key.overwrite
      }
      return {
        id: id,
        was: was,
        now: now,
        overwrite: overwrite
      }
    }
    throw new Error('Undefined IPNS key rename...')
  }

  module.exports = IpfsLibrary
})()
