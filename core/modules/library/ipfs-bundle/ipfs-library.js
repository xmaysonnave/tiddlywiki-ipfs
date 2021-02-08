'use strict'

const getIpfs = require('ipfs-provider').getIpfs
const providers = require('ipfs-provider').providers

const { httpClient, windowIpfs } = providers

/*
 * https://infura.io/docs
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/
var IpfsLibrary = function (ipfsBundle) {
  this.ipfsBundle = ipfsBundle
  /*eslint no-unused-vars:"off"*/
  this.name = 'ipfs-library'
}

IpfsLibrary.prototype.getLogger = function () {
  return this.ipfsBundle.getLogger()
}

IpfsLibrary.prototype.add = async function (client, content) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  if (content === undefined || content == null) {
    throw new Error('Undefined content...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['add'] })
  }
  // Process
  if (client !== undefined && client.add !== undefined) {
    const options = {
      chunker: 'rabin-262144-524288-1048576',
      cidVersion: 0,
      hashAlg: 'sha2-256',
      pin: true,
      rawLeaves: false,
    }
    // Process
    this.getLogger().info('Processing IPFS add...')
    // 1 - https://github.com/ipfs/go-ipfs/issues/5683
    // default chunker: "size-262144"
    // chunker: "rabin-262144-524288-1048576"
    // 2 - TODO: small content generates an incnsistent cid when cidVersion: 1 is set.
    // Not a 'dag-pb' but a 'raw' multicodec instead
    // We generate a V0 and convert it to a V1
    // https://github.com/xmaysonnave/tiddlywiki-ipfs/issues/14
    const result = await client.add(content, options)
    // Check
    if (result === undefined || result == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    var cid = null
    if (result.cid !== undefined && result.cid !== null) {
      cid = result.cid
    }
    var mode = null
    if (result.mode !== undefined && result.mode !== null) {
      mode = result.mode
    }
    const mtime = result.mtime
    var path = null
    if (result.path !== undefined && result.path !== null) {
      path = result.path
    }
    var size = null
    if (result.size !== undefined && result.size !== null) {
      size = result.size
    }
    if (cid == null || mode == null || path == null || size == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    const cidV1 = this.ipfsBundle.cidToCidV1(cid, 'ipfs', true)
    return {
      cid: cidV1,
      mode: mode,
      mtime: mtime,
      path: path,
      size: size,
    }
  }
  throw new Error('Undefined IPFS add...')
}

IpfsLibrary.prototype.addAll = async function (client, content, options) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  if (content === undefined || content == null) {
    throw new Error('Undefined content...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['addAll'] })
  }
  // Process
  if (client !== undefined && client.addAll !== undefined) {
    const added = new Map()
    // Process
    this.getLogger().info('Processing IPFS addAll...')
    for await (const result of client.addAll(content, options)) {
      // Check
      if (result === undefined || result == null) {
        throw new Error('IPFS client returned an unknown result...')
      }
      var cid = null
      if (result.cid !== undefined && result.cid !== null) {
        cid = result.cid
      }
      var path = null
      if (result.path !== undefined && result.path !== null) {
        path = result.path
      }
      var mode = null
      if (result.mode !== undefined && result.mode !== null) {
        mode = result.mode
      }
      const mtime = result.mtime
      var size = null
      if (result.size !== undefined && result.size !== null) {
        size = result.size
      }
      if (cid == null || path == null || mode == null || size == null) {
        throw new Error('IPFS client returned an unknown result...')
      }
      const cidV1 = this.ipfsBundle.cidToCidV1(cid)
      added.set(cidV1, {
        path: path,
        mode: mode,
        mtime: mtime,
        size: size,
      })
    }
    return added
  }
  throw new Error('Undefined IPFS addAll...')
}

IpfsLibrary.prototype.analyzePinType = function (type) {
  if (type === undefined || type == null || type.trim() === '') {
    return {
      parentCid: null,
      type: null,
    }
  }
  var res = type.split(' ')
  if (res.length === 1) {
    return {
      parentCid: null,
      type: res[0],
    }
  }
  if (res.length !== 3 && res.length !== 4) {
    throw new Error(`Unknown pin type: ${type}`)
  }
  const index = res.length % 3
  if (res[index] !== 'indirect') {
    throw new Error(`Unknown pin type: ${type}`)
  }
  if (res[index + 1] !== 'through') {
    throw new Error(`Unknown pin type: ${type}`)
  }
  const parentCid = this.ipfsBundle.getCid(res[index + 2])
  if (parentCid == null) {
    throw new Error(`Unknown pin type: ${type}`)
  }
  return {
    parentCid: parentCid,
    type: res[0],
  }
}

// https://github.com/ipfs/interface-js-ipfs-core/blob/master/SPEC/KEY.md#keygen
// https://github.com/libp2p/js-libp2p-crypto/issues/145
IpfsLibrary.prototype.genKey = async function (client, ipnsName) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  ipnsName = ipnsName == null || ipnsName === undefined || ipnsName.trim() === '' ? null : ipnsName.trim()
  if (ipnsName == null) {
    throw new Error('Undefined IPNS name...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['key'] })
  }
  if (client !== undefined && client.key !== undefined && client.key.gen !== undefined) {
    this.getLogger().info('Processing IPFS key gen...')
    const key = await client.key.gen(ipnsName, {
      type: 'ed25519',
    })
    if (key === undefined || key == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    var keyId = null
    if (key.id !== undefined && key.id !== null) {
      keyId = key.id
    }
    if (keyId == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return keyId
  }
  throw new Error('Undefined IPFS key gen...')
}

// Default
IpfsLibrary.prototype.getDefaultIpfs = async function (apiUrl) {
  // IPFS Companion first
  try {
    const { ipfs, provider } = await this.getWindowIpfs()
    if (ipfs !== null) {
      return {
        ipfs: ipfs,
        provider: provider,
      }
    }
  } catch (error) {
    // IPFS Companion failed
  }
  apiUrl = apiUrl === undefined || apiUrl == null || apiUrl.toString().trim() === '' ? null : apiUrl
  if (apiUrl == null) {
    throw new Error('Undefined IPFS API URL...')
  }
  // Load IpfsHttpClient
  try {
    const { ipfs, provider } = await this.getHttpIpfs(apiUrl)
    if (ipfs !== null) {
      return {
        ipfs: ipfs,
        provider: provider,
      }
    }
  } catch (error) {
    // IPFS HTTP client failed
  }
  throw new Error('Unable to retrieve IPFS Companion and IPFS API URL...')
}

// ipfs-http-client
IpfsLibrary.prototype.getHttpIpfs = async function (apiUrl) {
  apiUrl = apiUrl === undefined || apiUrl == null || apiUrl.toString().trim() === '' ? null : apiUrl
  if (apiUrl == null) {
    throw new Error('Undefined IPFS API URL...')
  }
  try {
    await this.ipfsBundle.loadIpfsHttpLibrary()
    this.getLogger().info(
      `Processing connection to IPFS API URL:
${apiUrl}`
    )
    const protocol = apiUrl.protocol.slice(0, -1)
    var port = apiUrl.port
    if (port === undefined || port == null || port.trim() === '') {
      port = 443
      if (protocol === 'http') {
        port = 80
      }
    }
    const { ipfs, provider } = await getIpfs({
      providers: [
        httpClient({
          apiAddress: {
            protocol: protocol,
            host: apiUrl.hostname,
            port: port,
            timeout: '4m',
          },
        }),
      ],
    })
    return {
      ipfs: ipfs,
      provider: `${provider}, ${apiUrl}`,
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Unreachable IPFS API URL...')
}

// IPFS companion
IpfsLibrary.prototype.getWindowIpfs = async function () {
  try {
    this.getLogger().info('Processing connection to IPFS Companion...')
    const { ipfs, provider } = await getIpfs({
      providers: [windowIpfs()],
    })
    return {
      ipfs: ipfs,
      provider: provider,
    }
  } catch (error) {
    this.getLogger().error(error)
  }
  throw new Error('Unreachable IPFS Companion...')
}

IpfsLibrary.prototype.hasPin = async function (client, key, type, ipfsPath) {
  try {
    if (ipfsPath) {
      ipfsPath = `${key}${ipfsPath}`
    } else {
      ipfsPath = key
    }
    for await (var { cid, type: fetchedType } of client.pin.ls({
      paths: [ipfsPath],
    })) {
      if (cid !== undefined && cid !== null) {
        var { type: fetchedType, parentCid } = this.analyzePinType(fetchedType)
        const cidV1 = this.ipfsBundle.cidToCidV1(cid)
        const parentCidV1 = parentCid !== null ? this.ipfsBundle.cidToCidV1(parentCid) : null
        if (type) {
          if (type === fetchedType) {
            return {
              cid: cidV1,
              parentCid: parentCidV1,
              type: type,
            }
          }
        }
        return {
          cid: cidV1,
          parentCid: parentCidV1,
          type: fetchedType,
        }
      }
    }
  } catch (error) {
    // Ignore
  }
  return {
    cid: '',
    parentCid: null,
    type: '',
  }
}

IpfsLibrary.prototype.keyList = async function (client) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['key'] })
  }
  if (client !== undefined && client.key !== undefined && client.key.list !== undefined) {
    this.getLogger().info('Processing IPFS key list...')
    const result = await client.key.list()
    if (result === undefined || result == null || Array.isArray(result) === false) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return result
  }
  throw new Error('Undefined IPFS key list...')
}

IpfsLibrary.prototype.filesStat = async function (client, ipfsPath) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  if (ipfsPath === undefined || ipfsPath == null) {
    throw new Error('Undefined IPFS path...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['files'] })
  }
  // Process
  if (client !== undefined && client.files !== undefined && client.files.stat !== undefined) {
    // Process
    this.getLogger().info('Processing IPFS files stat...')
    const result = await client.files.stat(ipfsPath)
    // Check
    if (result === undefined || result == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    var cid = null
    if (result.cid !== undefined && result.cid !== null) {
      cid = result.cid
    }
    var blocks = null
    if (result.blocks !== undefined && result.blocks !== null) {
      blocks = result.blocks
    }
    var cumulativeSize = null
    if (result.cumulativeSize !== undefined && result.cumulativeSize !== null) {
      cumulativeSize = result.cumulativeSize
    }
    var local = null
    if (result.local !== undefined && result.local !== null) {
      local = result.local
    }
    var size = null
    if (result.size !== undefined && result.size !== null) {
      size = result.size
    }
    var sizeLocal = null
    if (result.sizeLocal !== undefined && result.sizeLocal !== null) {
      sizeLocal = result.sizeLocal
    }
    var type = null
    if (result.type !== undefined && result.type !== null) {
      type = result.type
    }
    var withLocality = null
    if (result.withLocality !== undefined && result.withLocality !== null) {
      withLocality = result.withLocality
    }
    if (cid == null || blocks == null || cumulativeSize == null || size == null || type == null || withLocality == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    if (withLocality) {
      if (local == null || sizeLocal == null) {
        throw new Error('IPFS client returned an unknown result...')
      }
    }
    const cidV1 = this.ipfsBundle.cidToCidV1(cid)
    return {
      cid: cidV1,
      blocks: blocks,
      cumulativeSize: cumulativeSize,
      local: local,
      size: size,
      sizeLocal: sizeLocal,
      type: type,
      withLocality: withLocality,
    }
  }
  throw new Error('Undefined IPFS files stat...')
}

IpfsLibrary.prototype.keyRename = async function (client, oldIpnsName, newIpnsName) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  oldIpnsName = oldIpnsName == null || oldIpnsName === undefined || oldIpnsName.trim() === '' ? null : oldIpnsName.trim()
  if (oldIpnsName == null) {
    throw new Error('Undefined Old IPNS name...')
  }
  newIpnsName = newIpnsName == null || newIpnsName === undefined || newIpnsName.trim() === '' ? null : newIpnsName.trim()
  if (newIpnsName == null) {
    throw new Error('Undefined New IPNS name...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['key'] })
  }
  if (client !== undefined && client.key !== undefined && client.key.rename !== undefined) {
    this.getLogger().info('Processing IPFS key rename...')
    const key = await client.key.rename(oldIpnsName, newIpnsName)
    if (key === undefined || key == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    var keyId = null
    if (key.id !== undefined && key.id !== null) {
      keyId = key.id
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
    if (keyId == null || was == null || now == null || overwrite == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return {
      keyId: keyId,
      was: was,
      now: now,
      overwrite: overwrite,
    }
  }
  throw new Error('Undefined IPFS key rename...')
}

IpfsLibrary.prototype.ls = async function (client, ipfsPath) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  if (ipfsPath === undefined || ipfsPath == null) {
    throw new Error('Undefined IPFS path...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['ls'] })
  }
  // Process
  if (client !== undefined && client.ls !== undefined) {
    const content = new Map()
    // Process
    this.getLogger().info('Processing IPFS ls...')
    for await (const result of client.ls(ipfsPath)) {
      // Check
      if (result === undefined || result == null) {
        throw new Error('IPFS client returned an unknown result...')
      }
      var cid = null
      if (result.cid !== undefined && result.cid !== null) {
        cid = result.cid
      }
      var depth = null
      if (result.depth !== undefined && result.depth !== null) {
        depth = result.depth
      }
      var mode = null
      if (result.mode !== undefined && result.mode !== null) {
        mode = result.mode
      }
      const mtime = result.mtime
      var name = null
      if (result.name !== undefined && result.name !== null) {
        name = result.name
      }
      var path = null
      if (result.path !== undefined && result.path !== null) {
        path = result.path
      }
      var size = null
      if (result.size !== undefined && result.size !== null) {
        size = result.size
      }
      var type = null
      if (result.type !== undefined && result.type !== null) {
        type = result.type
      }
      if (cid == null || depth == null || mode == null || name == null || path == null || size == null || type == null) {
        throw new Error('IPFS client returned an unknown result...')
      }
      const cidV1 = this.ipfsBundle.cidToCidV1(cid)
      content.set(cidV1, {
        depth: depth,
        mode: mode,
        mtime: mtime,
        name: name,
        path: path,
        size: size,
        type: type,
      })
    }
    return content
  }
  throw new Error('Undefined IPFS ls...')
}

IpfsLibrary.prototype.namePublish = async function (client, ipnsName, cid) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  ipnsName = ipnsName == null || ipnsName === undefined || ipnsName.trim() === '' ? null : ipnsName.trim()
  if (ipnsName == null) {
    throw new Error('Undefined IPNS name...')
  }
  cid = cid == null || cid === undefined || cid.toString().trim() === '' ? null : cid.toString().trim()
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['name'] })
  }
  if (client !== undefined && client.name !== undefined && client.name.publish !== undefined) {
    this.getLogger().info('Processing IPFS name publish...')
    const result = await client.name.publish(cid, {
      resolve: true,
      key: ipnsName,
      allowOffline: false,
    })
    if (result === undefined || result == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    var name = null
    if (result.name !== undefined && result.name !== null) {
      name = result.name
    }
    var value = null
    if (result.value !== undefined && result.value !== null) {
      value = result.value
    }
    if (name == null || value == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return {
      name: name,
      value: value,
    }
  }
  throw new Error('Undefined IPFS name publish...')
}

IpfsLibrary.prototype.nameResolve = async function (client, value) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  value = value == null || value === undefined || value.trim() === '' ? null : value.trim()
  if (value == null) {
    throw new Error('Undefined IPNS address...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['name'] })
  }
  if (client !== undefined && client.name !== undefined && client.name.resolve !== undefined) {
    this.getLogger().info('Processing IPFS name resolve...')
    const resolvedPaths = await client.name.resolve(value, {
      nocache: false,
      recursive: true,
    })
    if (resolvedPaths === undefined || resolvedPaths == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    // https://gist.github.com/alanshaw/04b2ddc35a6fff25c040c011ac6acf26
    var lastPath = null
    for await (const path of resolvedPaths) {
      lastPath = path !== undefined || path !== null ? path : null
    }
    if (lastPath == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return lastPath
  }
  throw new Error('Undefined IPFS name resolve...')
}

IpfsLibrary.prototype.pinAdd = async function (client, cid, recursive) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  cid = cid == null || cid === undefined || cid.toString().trim() === '' ? null : cid.toString().trim()
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  recursive = recursive == null || recursive === undefined ? true : recursive === true
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['pin'] })
  }
  // Process
  if (client !== undefined && client.pin !== undefined && client.pin.add !== undefined) {
    this.getLogger().info('Processing IPFS pin add...')
    const result = await client.pin.add(cid, {
      recursive: recursive,
    })
    if (result === undefined || result == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return this.ipfsBundle.cidToCidV1(result, 'ipfs', true)
  }
  throw new Error('Undefined IPFS pin add...')
}

IpfsLibrary.prototype.pinRm = async function (client, cid, recursive) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  cid = cid == null || cid === undefined || cid.toString().trim() === '' ? null : cid.toString().trim()
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  recursive = recursive == null || recursive === undefined ? true : recursive === true
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['pin'] })
  }
  // Process
  if (client !== undefined && client.pin !== undefined && client.pin.rm !== undefined) {
    this.getLogger().info('Processing IPFS pin rm...')
    const result = await client.pin.rm(cid, {
      recursive: recursive,
    })
    if (result === undefined || result == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return this.ipfsBundle.cidToCidV1(result, 'ipfs', true)
  }
  throw new Error('Undefined IPFS pin rm...')
}

IpfsLibrary.prototype.rmKey = async function (client, ipnsName) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  ipnsName = ipnsName == null || ipnsName === undefined || ipnsName.trim() === '' ? null : ipnsName.trim()
  if (ipnsName == null) {
    throw new Error('Undefined IPNS name...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['key'] })
  }
  if (client !== undefined && client.key !== undefined && client.key.rm !== undefined) {
    this.getLogger().info('Processing IPFS key rm...')
    const key = await client.key.rm(ipnsName)
    if (key === undefined || key == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    var keyId = null
    if (key.id !== undefined && key.id !== null) {
      keyId = key.id
    }
    if (keyId == null) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return keyId
  }
  throw new Error('Undefined IPFS key rm...')
}

exports.IpfsLibrary = IpfsLibrary
