/*\
title: $:/plugins/ipfs/ipfs-wrapper.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Wrapper

\*/

;(function () {
  /*jslint node:true,browser:true*/
  /*global $tw:false*/
  'use strict'

  const ipfsKeyword = 'ipfs'
  const ipnsKeyword = 'ipns'

  /*eslint no-unused-vars:"off"*/
  const name = 'ipfs-wrapper'

  var IpfsWrapper = function (ipfsBundle) {
    this.ipfsBundle = ipfsBundle
    this.ipfsLibrary = ipfsBundle.ipfsLibrary
    this.ipfsUrl = ipfsBundle.ipfsUrl
  }

  IpfsWrapper.prototype.getLogger = function () {
    if (window.logger !== undefined && window.logger !== null) {
      return window.logger
    }
    return console
  }

  IpfsWrapper.prototype.getWindowIpfsClient = async function () {
    // IPFS Companion
    try {
      const policy = await this.ipfsLibrary.getWindowIpfs()
      if (policy !== null && policy.ipfs !== null && policy.provider !== null) {
        return policy
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to retrieve IPFS Companion...')
  }

  IpfsWrapper.prototype.getHttpIpfsClient = async function (url) {
    // HTTP Client
    try {
      const policy = await this.ipfsLibrary.getHttpIpfs(url)
      if (policy !== null && policy.ipfs !== null && policy.provider !== null) {
        return policy
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to retrieve an IPFS HTTP provider...')
  }

  IpfsWrapper.prototype.getIpfsClient = async function (url) {
    // IPFS client
    try {
      var policy = null
      const ipfsProvider = $tw.utils.getIpfsProvider()
      if (ipfsProvider === 'window') {
        policy = await this.ipfsLibrary.getWindowIpfs()
      } else if (ipfsProvider === 'http') {
        policy = await this.ipfsLibrary.getHttpIpfs(url)
      } else {
        policy = await this.ipfsLibrary.getDefaultIpfs(url)
      }
      if (policy !== null && policy.ipfs !== null && policy.provider !== null) {
        return policy
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to retrieve an IPFS provider...')
  }

  IpfsWrapper.prototype.getIpnsIdentifiers = async function (
    ipfs,
    identifier,
    ipnsName
  ) {
    identifier =
      identifier === undefined || identifier == null || identifier.trim() === ''
        ? null
        : identifier.trim()
    ipnsName =
      ipnsName === undefined || ipnsName == null || ipnsName.trim() === ''
        ? null
        : ipnsName.trim()
    if (identifier == null && ipnsName == null) {
      throw new Error('Undefined IPNS identifiers...')
    }
    var found = false
    var ipnsKey = null
    var keys = null
    var normalizedUrl = null
    try {
      // Only the server who generates the key has the knowledge
      keys = await this.getIpnsKeys(ipfs)
    } catch (error) {
      this.getLogger().error(error)
    }
    // Do our best
    if (ipnsName !== null && identifier !== null) {
      if (keys !== null && keys !== undefined && Array.isArray(keys)) {
        for (var index = 0; index < keys.length; index++) {
          const key = this.ipfsBundle.cidToLibp2pKeyCidV1(keys[index].id)
          if (key === identifier && keys[index].name === ipnsName) {
            ipnsKey = identifier
            found = true
            break
          }
        }
      }
    } else if (ipnsName !== null) {
      if (keys !== null && keys !== undefined && Array.isArray(keys)) {
        for (var index = 0; index < keys.length; index++) {
          const key = this.ipfsBundle.cidToLibp2pKeyCidV1(keys[index].id)
          if (keys[index].name === ipnsName) {
            ipnsKey = key
            found = true
            break
          }
        }
      }
    } else {
      if (keys !== null && keys !== undefined && Array.isArray(keys)) {
        for (var index = 0; index < keys.length; index++) {
          const key = this.ipfsBundle.cidToLibp2pKeyCidV1(keys[index].id)
          if (key === identifier || keys[index].name === identifier) {
            ipnsKey = key
            ipnsName = keys[index].name
            found = true
            break
          }
        }
      }
    }
    if (found === false) {
      // Unable to resolve the keys, check if identifier is a an IPFS cid
      if (this.ipfsBundle.isCid(identifier) === false) {
        throw new Error('Unknown IPNS identifier...')
      }
      ipnsKey = identifier
    }
    // Lets build an url, the resolver will do the final check, we cannot do more here
    normalizedUrl = this.ipfsUrl.normalizeUrl(`/${ipnsKeyword}/${ipnsKey}`)
    if (found) {
      this.getLogger().info(
        `Successfully Fetched IPNS identifiers: ${ipnsName}
 ${normalizedUrl}`
      )
    } else {
      this.getLogger().info(
        `Unable to Fetch IPNS identifiers, default to
 ${normalizedUrl}`
      )
    }
    return {
      ipnsKey: ipnsKey,
      ipnsName: ipnsName,
      normalizedUrl: normalizedUrl
    }
  }

  IpfsWrapper.prototype.generateIpnsKey = async function (ipfs, ipnsName) {
    try {
      const key = await this.ipfsLibrary.genKey(ipfs, ipnsName)
      const cid = this.ipfsBundle.cidToLibp2pKeyCidV1(key)
      const url = this.ipfsUrl.normalizeUrl(`/${ipnsKeyword}/${cid}`)
      this.getLogger().info(
        `Successfully generated IPNS key with IPNS name: ${ipnsName}
 ${url}`
      )
      return cid
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to generate and IPNS key...')
  }

  IpfsWrapper.prototype.removeIpnsKey = async function (ipfs, ipnsName) {
    try {
      const hash = await this.ipfsLibrary.rmKey(ipfs, ipnsName)
      this.getLogger().info(`Successfully removed IPNS name: ${ipnsName}`)
      return hash
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to remove an IPNS Key...')
  }

  IpfsWrapper.prototype.renameIpnsName = async function (
    ipfs,
    oldIpnsName,
    newIpnsName
  ) {
    try {
      const { id, was, now } = await this.ipfsLibrary.renameKey(
        ipfs,
        oldIpnsName,
        newIpnsName
      )
      this.getLogger().info(
        `Successfully renamed IPNS name: ${was} with ${now}`
      )
      const key = this.ipfsBundle.cidToLibp2pKeyCidV1(id)
      return {
        ipnsKey: key,
        ipnsName: now
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to rename an IPNS name...')
  }

  IpfsWrapper.prototype.getIpnsKeys = async function (ipfs) {
    try {
      const keys = await this.ipfsLibrary.getKeys(ipfs)
      this.getLogger().info('Successfully fetched IPNS keys...')
      return keys
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to fetch IPNS keys...')
  }

  IpfsWrapper.prototype.fetchFromIpfs = async function (ipfs, cid) {
    cid =
      cid === undefined || cid == null || cid.toString().trim() === ''
        ? null
        : cid.toString().trim()
    if (cid == null) {
      throw new Error('Undefined IPNS identifier...')
    }
    const pathname = `/${ipfsKeyword}/${cid}`
    try {
      const fetched = await this.ipfsLibrary.cat(ipfs, pathname)
      const url = this.ipfsUrl.normalizeUrl(pathname)
      this.getLogger().info(`Successfully fetched:
 ${url}`)
      return fetched
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to fetch from IPFS...')
  }

  IpfsWrapper.prototype.addToIpfs = async function (ipfs, content) {
    try {
      const { hash, size } = await this.ipfsLibrary.add(ipfs, content)
      const pathname = '/' + ipfsKeyword + '/' + hash
      const url = this.ipfsUrl.normalizeUrl(pathname)
      this.getLogger().info(`Successfully added ${size}:
 ${url}`)
      return {
        added: hash,
        size: size
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to add content to IPFS...')
  }

  IpfsWrapper.prototype.resolveIpnsKey = async function (ipfs, ipnsKey) {
    ipnsKey =
      ipnsKey === undefined || ipnsKey == null || ipnsKey.trim() === ''
        ? null
        : ipnsKey.trim()
    if (ipnsKey == null) {
      throw new Error('Undefined IPNS key...')
    }
    const pathname = `/${ipnsKeyword}/${ipnsKey}`
    try {
      const url = this.ipfsUrl.normalizeUrl(pathname)
      const resolved = await this.ipfsLibrary.resolve(ipfs, pathname)
      const { cid } = this.ipfsBundle.decodeCid(resolved)
      if (cid !== null) {
        const parsed = this.ipfsUrl.normalizeUrl(resolved)
        this.getLogger().info(
          `Successfully resolved IPNS key:
 ${url}
 ${parsed}`
        )
        return cid
      }
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to resolve an IPNS key...')
  }

  IpfsWrapper.prototype.publishIpnsName = async function (
    cid,
    ipfs,
    ipnsKey,
    ipnsName
  ) {
    ipnsKey =
      ipnsKey === undefined || ipnsKey == null || ipnsKey.trim() === ''
        ? null
        : ipnsKey.trim()
    if (ipnsKey == null) {
      throw new Error('Undefined IPNS key...')
    }
    ipnsName =
      ipnsName === undefined || ipnsName == null || ipnsName.trim() === ''
        ? null
        : ipnsName.trim()
    if (ipnsName == null) {
      throw new Error('Undefined IPNS name...')
    }
    cid =
      cid === undefined || cid == null || cid.toString().trim() === ''
        ? null
        : cid.toString().trim()
    if (cid == null) {
      throw new Error('Undefined IPNS identifier...')
    }
    // Path
    const key = `/${ipnsKeyword}/${ipnsKey}`
    const pathname = `/${ipfsKeyword}/${cid}`
    try {
      // Publish
      const result = await this.ipfsLibrary.publish(ipfs, ipnsName, pathname)
      const keyParsed = this.ipfsUrl.normalizeUrl(key)
      const url = this.ipfsUrl.normalizeUrl(pathname)
      this.getLogger().info(
        `Successfully published IPNS name: ${ipnsName}
 ${keyParsed}
 ${url}`
      )
      return result
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to publish an IPNS name...')
  }

  IpfsWrapper.prototype.pinToIpfs = async function (ipfs, cid) {
    cid =
      cid === undefined || cid == null || cid.toString().trim() === ''
        ? null
        : cid.toString().trim()
    if (cid == null) {
      throw new Error('Undefined IPNS identifier...')
    }
    const pathname = `/${ipfsKeyword}/${cid}`
    try {
      const pinned = await this.ipfsLibrary.pin(ipfs, pathname)
      const url = this.ipfsUrl.normalizeUrl(pathname)
      this.getLogger().info(
        `Successfully pinned:
 ${url}`
      )
      return pinned
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to pin to IPFS...')
  }

  IpfsWrapper.prototype.unpinFromIpfs = async function (ipfs, cid) {
    cid =
      cid === undefined || cid == null || cid.toString().trim() === ''
        ? null
        : cid.toString().trim()
    if (cid == null) {
      throw new Error('Undefined IPNS identifier...')
    }
    const pathname = `/${ipfsKeyword}/${cid}`
    try {
      const unpinned = await this.ipfsLibrary.unpin(ipfs, pathname)
      const url = this.ipfsUrl.normalizeUrl(pathname)
      this.getLogger().info(
        `Successfully unpinned:
 ${url}`
      )
      return unpinned
    } catch (error) {
      this.getLogger().error(error)
    }
    throw new Error('Failed to unpin from IPFS...')
  }

  exports.IpfsWrapper = IpfsWrapper
})()
