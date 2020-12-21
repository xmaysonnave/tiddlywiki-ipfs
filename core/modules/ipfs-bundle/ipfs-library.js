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
    var protocol = apiUrl.protocol.slice(0, -1)
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

IpfsLibrary.prototype.analyzeType = function (type) {
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
  if (!parentCid) {
    throw new Error(`Unknown pin type: ${type}`)
  }
  return {
    parentCid: parentCid,
    type: res[0],
  }
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
        var { type: fetchedType, parentCid } = this.analyzeType(fetchedType)
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

IpfsLibrary.prototype.pinRm = async function (client, cid, recursive) {
  try {
    const unpinned = await client.pin.rm(cid, {
      recursive: recursive,
    })
    return this.ipfsBundle.cidToCidV1(unpinned)
  } catch (error) {
    return ''
  }
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
    const added = await client.add(content, options)
    // Check
    if (!added || !added.cid) {
      throw new Error('IPFS client returned an unknown result...')
    }
    const cidV1 = this.ipfsBundle.cidToCidV1(added.cid.toString(), 'ipfs', true)
    return {
      hash: cidV1.toString(),
      size: added.size,
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
      if (!result || !result.cid) {
        throw new Error('IPFS client returned an unknown result...')
      }
      const cidV1 = this.ipfsBundle.cidToCidV1(result.cid.toString())
      added.set(cidV1.toString(), {
        path: result.path,
        mode: result.mode,
        mtime: result.mtime,
        size: result.size,
      })
    }
    return added
  }
  throw new Error('Undefined IPFS addAll...')
}

IpfsLibrary.prototype.pin = async function (client, cid) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  cid = cid == null || cid === undefined || cid.trim() === '' ? null : cid.trim()
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['pin'] })
  }
  // Process
  if (client && client.pin && client.pin.add) {
    this.getLogger().info('Processing IPFS pin add...')
    const result = await client.pin.add(cid, {
      recursive: true,
    })
    return result
  }
  throw new Error('Undefined IPFS pin add...')
}

IpfsLibrary.prototype.unpin = async function (client, cid) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  cid = cid == null || cid === undefined || cid.trim() === '' ? null : cid.trim()
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['pin'] })
  }
  // Process
  if (client && client.pin && client.pin.rm) {
    this.getLogger().info('Processing IPFS pin rm...')
    const result = await client.pin.rm(cid, {
      recursive: true,
    })
    return result
  }
  throw new Error('Undefined IPFS pin rm')
}

IpfsLibrary.prototype.publish = async function (client, ipnsName, cid) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  cid = cid == null || cid === undefined || cid.trim() === '' ? null : cid.trim()
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  ipnsName = ipnsName == null || ipnsName === undefined || ipnsName.trim() === '' ? null : ipnsName.trim()
  if (ipnsName == null) {
    throw new Error('Undefined IPNS name...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['name'] })
  }
  if (client && client.name && client.name.publish) {
    this.getLogger().info('Processing IPFS name publish...')
    const result = await client.name.publish(cid, {
      resolve: true,
      key: ipnsName,
      allowOffline: false,
    })
    if (!result) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return {
      name: result.name,
      value: result.value,
    }
  }
  throw new Error('Undefined IPFS name publish...')
}

IpfsLibrary.prototype.resolve = async function (client, id) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  id = id == null || id === undefined || id.trim() === '' ? null : id.trim()
  if (id == null) {
    throw new Error('Undefined IPNS key...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['name'] })
  }
  if (client && client.name && client.name.resolve) {
    this.getLogger().info('Processing IPFS name resolve...')
    const resolvedSource = await client.name.resolve(id, {
      nocache: false,
      recursive: true,
    })
    // https://gist.github.com/alanshaw/04b2ddc35a6fff25c040c011ac6acf26
    var lastResult = null
    for await (const resolved of resolvedSource) {
      lastResult = resolved
    }
    if (!lastResult) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return lastResult
  }
  throw new Error('Undefined IPFS name resolve...')
}

IpfsLibrary.prototype.getKeys = async function (client) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  // Window IPFS policy
  if (client.enable) {
    client = await client.enable({ commands: ['key'] })
  }
  if (client && client.key && client.key.list) {
    this.getLogger().info('Processing IPFS key list...')
    const result = await client.key.list()
    if (!result || !Array.isArray(result)) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return result
  }
  throw new Error('Undefined IPFS key list...')
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
  if (client && client.key && client.key.gen) {
    this.getLogger().info('Processing IPFS key gen...')
    const key = await client.key.gen(ipnsName, {
      type: 'ed25519',
    })
    if (!key || !key.id) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return key.id
  }
  throw new Error('Undefined IPFS key gen...')
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
  if (client && client.key && client.key.rm) {
    this.getLogger().info('Processing IPFS key rm...')
    const key = await client.key.rm(ipnsName)
    if (!key || !key.id) {
      throw new Error('IPFS client returned an unknown result...')
    }
    return key.id
  }
  throw new Error('Undefined IPFS key rm...')
}

IpfsLibrary.prototype.renameKey = async function (client, oldIpnsName, newIpnsName) {
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
  if (client && client.key && client.key.rename) {
    this.getLogger().info('Processing IPFS key rename...')
    const key = await client.key.rename(oldIpnsName, newIpnsName)
    if (!key) {
      throw new Error('IPFS client returned an unknown result...')
    }
    var id = null
    if (key.id) {
      id = key.id
    }
    var was = null
    if (key.was) {
      was = key.was
    }
    var now = null
    if (key.now) {
      now = key.now
    }
    var overwrite = null
    if (key.overwrite) {
      overwrite = key.overwrite
    }
    return {
      id: id,
      was: was,
      now: now,
      overwrite: overwrite,
    }
  }
  throw new Error('Undefined IPFS key rename...')
}

exports.IpfsLibrary = IpfsLibrary
