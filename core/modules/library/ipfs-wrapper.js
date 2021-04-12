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
    const { ipfs, provider } = await this.ipfsLibrary.getHttpIpfs(url)
    if (ipfs !== null && provider !== null) {
      return {
        ipfs: ipfs,
        provider: provider,
      }
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to retrieve an IPFS HTTP provider...')
}

IpfsWrapper.prototype.getIpfsClient = async function (url) {
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

IpfsWrapper.prototype.getIpnsIdentifier = async function (ipfs, identifier, resolveIpnsKey, base, path, ipnsKey) {
  identifier = identifier !== undefined && identifier !== null && identifier.toString().trim() !== '' ? identifier.toString().trim() : null
  ipnsKey = ipnsKey !== undefined && ipnsKey !== null && ipnsKey.trim() !== '' ? ipnsKey.trim() : null
  if (identifier == null && ipnsKey == null) {
    throw new Error('Undefined IPNS identifiers...')
  }
  path = path !== undefined && path !== null && path.trim() !== '' ? path.trim() : ''
  var ipnsCid = null
  if (this.ipfsBundle.getCid(identifier) !== null) {
    ipnsCid = identifier
  }
  var found = false
  var keys = null
  var normalizedUrl = null
  if (resolveIpnsKey || ipnsCid == null) {
    try {
      keys = await this.getIpnsKeys(ipfs)
    } catch (error) {
      this.getLogger().error(error)
      $tw.utils.alert(name, 'Unable to resolve IPNS keys...')
    }
  }
  // Do our best
  if (keys !== null && keys !== undefined && Array.isArray(keys)) {
    if (ipnsKey !== null && identifier !== null) {
      for (var index = 0; index < keys.length; index++) {
        const cidv1b32 = this.ipfsBundle.cidToLibp2pKeyCidV1(keys[index].id, 'base32', false).toString()
        const cidv1b36 = this.ipfsBundle.cidToLibp2pKeyCidV1(keys[index].id, 'base36', false).toString()
        if ((keys[index].id === identifier || cidv1b32 === identifier || cidv1b36 === identifier) && keys[index].name === ipnsKey) {
          ipnsCid = keys[index].id
          found = true
          break
        }
      }
    } else if (ipnsKey !== null) {
      for (var index = 0; index < keys.length; index++) {
        if (keys[index].name === ipnsKey) {
          ipnsCid = keys[index].id
          found = true
          break
        }
      }
    } else {
      for (var index = 0; index < keys.length; index++) {
        const cidv1b32 = this.ipfsBundle.cidToLibp2pKeyCidV1(keys[index].id, 'base32', false).toString()
        const cidv1b36 = this.ipfsBundle.cidToLibp2pKeyCidV1(keys[index].id, 'base36', false).toString()
        if (keys[index].id === identifier || cidv1b32 === identifier || cidv1b36 === identifier || keys[index].name === identifier) {
          ipnsCid = keys[index].id
          ipnsKey = keys[index].name
          found = true
          break
        }
      }
    }
    if (found === false) {
      if (this.ipfsBundle.getCid(identifier) == null) {
        throw new Error('Unknown IPNS identifier...')
      }
    }
  }
  // Path
  const startPath = `/${ipnsKeyword}/${ipnsCid}`
  if (path.startsWith(startPath)) {
    path = path.slice(startPath.length)
  }
  path = `${startPath}${path}`
  // Lets build an url, the resolver will do the final check, we cannot do more here
  if (found) {
    const cidv0 = this.ipfsBundle.cidToBase58CidV0(ipnsCid, false).toString()
    const cidv1b32 = this.ipfsBundle.cidToLibp2pKeyCidV1(cidv0, 'base32', false).toString()
    ipnsCid = this.ipfsBundle.cidToLibp2pKeyCidV1(cidv1b32, 'base36', false)
    normalizedUrl = this.ipfsUrl.normalizeUrl(path, base)
    this.getLogger().info(
      `Fetched IPNS key: '${ipnsKey}':
'dag-pb' "cidv0" (base58btc): ${cidAnalyser}${cidv0}
to 'libp2p-key' "cidv1" (base32): ${cidAnalyser}${cidv1b32}
to 'libp2p-key' "cidv1" (base36): ${cidAnalyser}${ipnsCid}
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
    ipnsCid: ipnsCid !== null ? ipnsCid.toString() : null,
    ipnsKey: ipnsKey,
    normalizedUrl: normalizedUrl,
  }
}

IpfsWrapper.prototype.generateIpnsCid = async function (ipfs, ipnsKey) {
  try {
    var ipnsCid = await this.ipfsLibrary.genKey(ipfs, ipnsKey)
    ipnsCid = this.ipfsBundle.cidToLibp2pKeyCidV1(ipnsCid, 'base36', true).toString()
    const url = this.ipfsUrl.normalizeUrl(`/${ipnsKeyword}/${ipnsCid}`)
    this.getLogger().info(
      `Generated IPNS cid with IPNS key '${ipnsKey}'
${url}`
    )
    return ipnsCid
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error(`Failed to generate IPNS cid with IPNS key '${ipnsKey}'...`)
}

IpfsWrapper.prototype.removeIpnsKey = async function (ipfs, ipnsKey) {
  try {
    const ipnsCid = await this.ipfsLibrary.rmKey(ipfs, ipnsKey)
    this.getLogger().info(`Removed IPNS key: ${ipnsKey}`)
    return ipnsCid
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to remove an IPNS Key...')
}

IpfsWrapper.prototype.renameIpnsKey = async function (ipfs, oldIpnsKey, newIpnsKey) {
  try {
    var { ipnsCid, was, now } = await this.ipfsLibrary.keyRename(ipfs, oldIpnsKey, newIpnsKey)
    ipnsCid = this.ipfsBundle.cidToLibp2pKeyCidV1(ipnsCid, 'base36', true).toString()
    this.getLogger().info(`Renamed IPNS key: ${was} with ${now}`)
    return {
      ipnsCid: ipnsCid,
      ipnsKey: now,
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to rename an IPNS key...')
}

IpfsWrapper.prototype.getIpnsKeys = async function (ipfs) {
  try {
    this.getLogger().info('Fetch IPNS keys...')
    const keyList = await this.ipfsLibrary.keyList(ipfs)
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
  try {
    const pathname = `/${ipfsKeyword}/${cid}`
    const url = this.ipfsUrl.normalizeUrl(pathname)
    this.getLogger().info(`Fetch:
${url}`)
    const fetched = await this.ipfsLibrary.cat(ipfs, pathname)
    return fetched
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to fetch from IPFS...')
}

IpfsWrapper.prototype.resolveIpfs = async function (ipfs, value, timeout) {
  value = value !== undefined && value !== null && value.toString().trim() !== '' ? value.toString().trim() : null
  if (value == null) {
    throw new Error('Undefined value...')
  }
  var cid = null
  var remainderPath = null
  try {
    var { cid, remainderPath } = await this.ipfsBundle.resolveIpfs(ipfs, value, timeout)
    if (cid !== null) {
      const url = this.ipfsUrl.normalizeUrl(`/ipfs/${cid}${remainderPath}`)
      this.getLogger().info(`Resolved IPFS path:
  ${url}`)
    }
  } catch (error) {
    this.getLogger().error(error)
    $tw.utils.alert(name, 'Unable to resolve IPFS path...')
  }
  return {
    cid: cid,
    remainderPath: remainderPath,
  }
}

IpfsWrapper.prototype.resolveIpfsContainer = async function (ipfs, value, timeout) {
  value = value !== undefined && value !== null && value.toString().trim() !== '' ? value.toString().trim() : null
  if (value == null) {
    throw new Error('Undefined value...')
  }
  var cid = null
  try {
    cid = await this.ipfsBundle.resolveIpfsContainer(ipfs, value, timeout)
    if (cid !== null) {
      const url = this.ipfsUrl.normalizeUrl(`/ipfs/${cid}`)
      this.getLogger().info(`Resolved IPFS container:
  ${url}`)
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  return cid
}

IpfsWrapper.prototype.resolveIpnsKey = async function (ipfs, ipnsKey, options) {
  ipnsKey = ipnsKey !== undefined && ipnsKey !== null && ipnsKey.toString().trim() !== '' ? ipnsKey.toString().trim() : null
  if (ipnsKey == null) {
    throw new Error('Undefined IPNS key...')
  }
  // The IPNS address you want to resolve.
  // eg: const addr = '/ipns/ipfs.io'
  const pathname = `/${ipnsKeyword}/${ipnsKey}`
  try {
    const url = this.ipfsUrl.normalizeUrl(pathname)
    const resolved = await this.ipfsLibrary.nameResolve(ipfs, pathname, options)
    const { ipfsCid } = this.ipfsBundle.getIpfsIdentifier(resolved)
    if (ipfsCid !== null) {
      const parsed = this.ipfsUrl.normalizeUrl(resolved)
      this.getLogger().info(
        `Resolved IPNS:
${url}
${parsed}`
      )
      return ipfsCid
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to resolve an IPNS key...')
}

IpfsWrapper.prototype.addAttachmentToIpfs = async function (ipfs, content, ipfsPath) {
  try {
    if (content === undefined || content == null) {
      throw new Error('Undefined content...')
    }
    ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.trim() !== '' ? ipfsPath.trim() : '/'
    const upload = []
    upload.push({
      path: `${ipfsPath}`,
      content: content,
    })
    const options = {
      chunker: 'rabin-262144-524288-1048576',
      cidVersion: 0,
      hashAlg: 'sha2-256',
      pin: false,
      rawLeaves: false,
      wrapWithDirectory: true,
    }
    if (ipfsPath === '/') {
      options.wrapWithDirectory = false
    }
    var cid = null
    var parentCid = null
    var parentSize = null
    var contentCid = null
    var contentPath = ''
    var contentSize = null
    const added = await this.ipfsLibrary.addAll(ipfs, upload, options)
    for (var [cid, details] of added.entries()) {
      if (added.size === 1 || details.path === '') {
        parentCid = cid
        parentSize = details.size
      } else {
        contentCid = cid
        contentPath = `/${details.path}`
        contentSize = details.size
      }
    }
    const url = this.ipfsUrl.normalizeUrl(`/${ipfsKeyword}/${parentCid}`)
    this.getLogger().info(`Added: ${parentSize} bytes,
${url}`)
    return {
      cid: contentCid !== null ? contentCid : parentCid,
      path: `ipfs://${parentCid}${contentPath}`,
      size: contentCid !== null ? contentSize : parentSize,
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to add content to IPFS...')
}

IpfsWrapper.prototype.addToIpfs = async function (ipfs, content) {
  try {
    if (content === undefined || content == null) {
      throw new Error('Undefined content...')
    }
    const { cid, path, size } = await this.ipfsLibrary.add(ipfs, content)
    const pathname = `/${ipfsKeyword}/${cid}`
    const url = this.ipfsUrl.normalizeUrl(pathname)
    this.getLogger().info(`Added: ${size} bytes,
${url}`)
    return {
      cid: cid,
      path: path,
      size: size,
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to add content to IPFS...')
}

IpfsWrapper.prototype.publishIpnsKey = async function (ipfs, ipfsCid, ipnsCid, ipnsKey, options) {
  ipfsCid = ipfsCid !== undefined && ipfsCid !== null && ipfsCid.toString().trim() !== '' ? ipfsCid.toString().trim() : null
  if (ipfsCid == null) {
    throw new Error('Undefined IPFS cid...')
  }
  ipnsCid = ipnsCid !== undefined && ipnsCid !== null && ipnsCid.trim() !== '' ? ipnsCid.trim() : null
  if (ipnsCid == null) {
    throw new Error('Undefined IPNS cid...')
  }
  ipnsKey = ipnsKey !== undefined && ipnsKey !== null && ipnsKey.toString().trim() !== '' ? ipnsKey.toString().trim() : null
  if (ipnsKey == null) {
    throw new Error('Undefined IPNS key...')
  }
  // Path
  try {
    // Publish
    const result = await this.ipfsBundle.namePublish(ipfs, ipnsKey, ipfsCid, options)
    const ipnsUrl = this.ipfsUrl.normalizeUrl(`/${ipnsKeyword}/${ipnsCid}`)
    const ipfsUrl = this.ipfsUrl.normalizeUrl(`/${ipfsKeyword}/${ipfsCid}`)
    this.getLogger().info(
      `Published IPNS key: ${ipnsKey}
${ipnsUrl}
${ipfsUrl}`
    )
    return result
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to publish an IPNS key...')
}

IpfsWrapper.prototype.pinToIpfs = async function (ipfs, ipfsPath, recursive) {
  ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.toString().trim() !== '' ? ipfsPath.toString().trim() : null
  if (ipfsPath == null) {
    throw new Error('Undefined IPFS path...')
  }
  try {
    const pinned = await this.ipfsLibrary.pinAdd(ipfs, ipfsPath, {
      recursive: recursive,
    })
    const url = this.ipfsUrl.normalizeUrl(ipfsPath)
    this.getLogger().info(
      `Pinned:
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
    const unpinned = await this.ipfsLibrary.pinRm(ipfs, ipfsPath, {
      recursive: recursive,
    })
    const url = this.ipfsUrl.normalizeUrl(ipfsPath)
    this.getLogger().info(
      `Unpinned:
${url}`
    )
    return unpinned
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Failed to unpin...')
}

exports.IpfsWrapper = IpfsWrapper
