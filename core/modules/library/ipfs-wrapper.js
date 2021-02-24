/*\
title: $:/plugins/ipfs/ipfs-wrapper.js
type: application/javascript
tags: $:/ipfs/core
module-type: library

IPFS Wrapper

\*/
/*jslint node:true,browser:true*/
/*global $tw:false*/
'use strict'

const cidAnalyser = 'https://cid.ipfs.io/#'

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
  return this.ipfsBundle.getLogger()
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

IpfsWrapper.prototype.getIpnsIdentifier = async function (ipfs, identifier, base, path, ipnsName) {
  identifier = identifier !== undefined && identifier !== null && identifier.toString().trim() !== '' ? identifier.toString().trim() : null
  ipnsName = ipnsName !== undefined && ipnsName !== null && ipnsName.trim() !== '' ? ipnsName.trim() : null
  if (identifier == null && ipnsName == null) {
    throw new Error('Undefined IPNS identifiers...')
  }
  path = path !== undefined && path !== null && path.trim() !== '' ? path.trim() : ''
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
        const cidv1b32 = this.ipfsBundle.cidToLibp2pKeyCidV1(keys[index].id, 'base32', false).toString()
        const cidv1b36 = this.ipfsBundle.cidToLibp2pKeyCidV1(keys[index].id, 'base36', false).toString()
        if ((keys[index].id === identifier || cidv1b32 === identifier || cidv1b36 === identifier) && keys[index].name === ipnsName) {
          ipnsKey = keys[index].id
          found = true
          break
        }
      }
    }
  } else if (ipnsName !== null) {
    if (keys !== null && keys !== undefined && Array.isArray(keys)) {
      for (var index = 0; index < keys.length; index++) {
        if (keys[index].name === ipnsName) {
          ipnsKey = keys[index].id
          found = true
          break
        }
      }
    }
  } else {
    if (keys !== null && keys !== undefined && Array.isArray(keys)) {
      for (var index = 0; index < keys.length; index++) {
        const cidv1b32 = this.ipfsBundle.cidToLibp2pKeyCidV1(keys[index].id, 'base32', false).toString()
        const cidv1b36 = this.ipfsBundle.cidToLibp2pKeyCidV1(keys[index].id, 'base36', false).toString()
        if (keys[index].id === identifier || cidv1b32 === identifier || cidv1b36 === identifier || keys[index].name === identifier) {
          ipnsKey = keys[index].id
          ipnsName = keys[index].name
          found = true
          break
        }
      }
    }
  }
  if (found === false) {
    // Unable to resolve the keys, check if identifier is an IPFS cid
    if (this.ipfsBundle.getCid(identifier) == null) {
      throw new Error('Unknown IPNS identifier...')
    }
    ipnsKey = identifier
  }
  // Path
  const startPath = `/${ipnsKeyword}/${ipnsKey}`
  if (path.startsWith(startPath)) {
    path = path.slice(startPath.length)
  }
  path = `${startPath}${path}`
  // Lets build an url, the resolver will do the final check, we cannot do more here
  if (found) {
    const cidv0 = this.ipfsBundle.cidToBase58CidV0(ipnsKey, false).toString()
    const cidv1b32 = this.ipfsBundle.cidToLibp2pKeyCidV1(cidv0, 'base32', false).toString()
    ipnsKey = this.ipfsBundle.cidToLibp2pKeyCidV1(cidv1b32, 'base36', false)
    normalizedUrl = this.ipfsUrl.normalizeUrl(path, base)
    this.getLogger().info(
      `Successfully Fetched IPNS identifiers: '${ipnsName}':
'dag-pb' "cidv0" (base58btc): ${cidAnalyser}${cidv0}
to 'libp2p-key' "cidv1" (base32): ${cidAnalyser}${cidv1b32}
to 'libp2p-key' "cidv1" (base36): ${cidAnalyser}${ipnsKey}
${normalizedUrl}`
    )
  } else {
    normalizedUrl = this.ipfsUrl.normalizeUrl(path, base)
    this.getLogger().info(
      `Unable to Fetch IPNS identifiers, default to
${normalizedUrl}`
    )
  }
  return {
    ipnsKey: ipnsKey !== null ? ipnsKey.toString() : null,
    ipnsName: ipnsName,
    normalizedUrl: normalizedUrl,
  }
}

IpfsWrapper.prototype.generateIpnsKey = async function (ipfs, ipnsName) {
  try {
    const key = await this.ipfsLibrary.genKey(ipfs, ipnsName)
    const cid = this.ipfsBundle.cidToLibp2pKeyCidV1(key, 'base36', true).toString()
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
    const msg = `Successfully removed IPNS name: ${ipnsName}`
    this.getLogger().info(msg)
    $tw.utils.alert(name, msg)
    return hash
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to remove an IPNS Key...')
}

IpfsWrapper.prototype.renameIpnsName = async function (ipfs, oldIpnsName, newIpnsName) {
  try {
    const { keyId, was, now } = await this.ipfsLibrary.keyRename(ipfs, oldIpnsName, newIpnsName)
    const key = this.ipfsBundle.cidToLibp2pKeyCidV1(keyId, 'base36', true).toString()
    const msg = `Successfully renamed IPNS name: ${was} with ${now}`
    this.getLogger().info(msg)
    $tw.utils.alert(name, msg)
    return {
      ipnsKey: key,
      ipnsName: now,
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to rename an IPNS name...')
}

IpfsWrapper.prototype.getIpnsKeys = async function (ipfs) {
  try {
    const keyList = await this.ipfsLibrary.keyList(ipfs)
    this.getLogger().info('Successfully fetched IPNS keys...')
    return keyList
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to fetch IPNS keys...')
}

IpfsWrapper.prototype.fetchFromIpfs = async function (ipfs, cid) {
  cid = cid !== undefined && cid !== null && cid.toString().trim() !== '' ? cid.toString().trim() : null
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

IpfsWrapper.prototype.getIpfsParentIdentifier = async function (ipfs, value) {
  value = value !== undefined && value !== null && value.toString().trim() !== '' ? value.toString().trim() : null
  if (value == null) {
    throw new Error('Undefined URL...')
  }
  var ipfsPath = null
  try {
    ipfsPath = await this.ipfsBundle.getIpfsParentIdentifier(ipfs, value)
    const url = this.ipfsUrl.normalizeUrl(ipfsPath)
    this.getLogger().info(`Successfully fetched parent identifier:
${url}`)
  } catch (error) {
    this.getLogger().error(error)
  }
  return ipfsPath
}

IpfsWrapper.prototype.addToIpfs = async function (ipfs, content) {
  try {
    const { cid, size } = await this.ipfsLibrary.add(ipfs, $tw.ipfs.StringToUint8Array(content))
    const pathname = `/${ipfsKeyword}/${cid}`
    const url = this.ipfsUrl.normalizeUrl(pathname)
    this.getLogger().info(`Successfully added: ${size} bytes,
${url}`)
    return {
      cid: cid,
      size: size,
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to add content to IPFS...')
}

IpfsWrapper.prototype.resolveIpnsKey = async function (ipfs, ipnsKey) {
  ipnsKey = ipnsKey !== undefined && ipnsKey !== null && ipnsKey.toString().trim() !== '' ? ipnsKey.toString().trim() : null
  if (ipnsKey == null) {
    throw new Error('Undefined IPNS key...')
  }
  const pathname = `/${ipnsKeyword}/${ipnsKey}`
  try {
    const url = this.ipfsUrl.normalizeUrl(pathname)
    const resolved = await this.ipfsLibrary.nameResolve(ipfs, pathname)
    const { cid } = this.ipfsBundle.getIpfsIdentifier(resolved)
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

IpfsWrapper.prototype.publishIpnsName = async function (cid, ipfs, ipnsKey, ipnsName) {
  ipnsKey = ipnsKey !== undefined && ipnsKey !== null && ipnsKey.toString().trim() !== '' ? ipnsKey.toString().trim() : null
  if (ipnsKey == null) {
    throw new Error('Undefined IPNS key...')
  }
  ipnsName = ipnsName !== undefined && ipnsName !== null && ipnsName.trim() !== '' ? ipnsName.trim() : null
  if (ipnsName == null) {
    throw new Error('Undefined IPNS name...')
  }
  cid = cid !== undefined && cid !== null && cid.toString().trim() !== '' ? cid.toString().trim() : null
  if (cid == null) {
    throw new Error('Undefined IPNS identifier...')
  }
  // Path
  const key = `/${ipnsKeyword}/${ipnsKey}`
  const pathname = `/${ipfsKeyword}/${cid}`
  try {
    // Publish
    const result = await this.ipfsLibrary.namePublish(ipfs, ipnsName, pathname)
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

IpfsWrapper.prototype.pinToIpfs = async function (ipfs, ipfsPath, recursive) {
  ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.toString().trim() !== '' ? ipfsPath.toString().trim() : null
  if (ipfsPath == null) {
    throw new Error('Undefined IPFS path...')
  }
  try {
    const pinned = await this.ipfsLibrary.pinAdd(ipfs, ipfsPath, recursive)
    const url = this.ipfsUrl.normalizeUrl(ipfsPath)
    this.getLogger().info(
      `Successfully pinned:
${url}`
    )
    return pinned
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to pin...')
}

IpfsWrapper.prototype.unpinFromIpfs = async function (ipfs, ipfsPath, recursive) {
  ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.toString().trim() !== '' ? ipfsPath.toString().trim() : null
  if (ipfsPath == null) {
    throw new Error('Undefined IPFS path...')
  }
  try {
    const unpinned = await this.ipfsLibrary.pinRm(ipfs, ipfsPath, recursive)
    const url = this.ipfsUrl.normalizeUrl(ipfsPath)
    this.getLogger().info(
      `Successfully unpinned:
${url}`
    )
    return unpinned
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to unpin...')
}

exports.IpfsWrapper = IpfsWrapper
