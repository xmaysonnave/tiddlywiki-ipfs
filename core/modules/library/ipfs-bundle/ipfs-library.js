'use strict'

const CID = require('cids')
const fromString = require('uint8arrays').fromString
const dagDirectory = fromString('\u0008\u0001')
const getIpfs = require('ipfs-provider').getIpfs
const providers = require('ipfs-provider').providers

const { httpClient, windowIpfs } = providers

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
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

IpfsLibrary.prototype.add = async function (client, content, options) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  if (content === undefined || content == null) {
    throw new Error('Undefined content...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['add'] })
  }
  if (client === undefined || client.add === undefined) {
    throw new Error('Undefined IPFS add...')
  }
  if (options === undefined || options == null) {
    options = {
      chunker: 'rabin-262144-524288-1048576',
      cidVersion: 0,
      hashAlg: 'sha2-256',
      pin: true,
      rawLeaves: false,
    }
  }
  // 1 - https://github.com/ipfs/go-ipfs/issues/5683
  // default chunker: "size-262144"
  // chunker: "rabin-262144-524288-1048576"
  // 2 - TODO: small content generates an incnsistent cid when cidVersion: 1 is set.
  // Not a 'dag-pb' but a 'raw' multicodec instead
  // We generate a V0 and convert it to a V1
  // https://github.com/xmaysonnave/tiddlywiki-ipfs/issues/14
  const result = await client.add(content, options)
  if (result === undefined || result == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  var cid = null
  if (result.cid !== undefined && result.cid !== null) {
    cid = result.cid
  }
  const mode = result.mode
  const mtime = result.mtime
  var path = null
  if (result.path !== undefined && result.path !== null) {
    path = result.path
  }
  var size = null
  if (result.size !== undefined && result.size !== null) {
    size = result.size
  }
  if (cid == null || path == null || size == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
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

IpfsLibrary.prototype.addAll = async function (client, content, options) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  if (content === undefined || content == null) {
    throw new Error('Undefined content...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['addAll'] })
  }
  if (client === undefined || client.addAll === undefined) {
    throw new Error('Undefined IPFS addAll...')
  }
  if (options === undefined || options == null) {
    options = {
      chunker: 'rabin-262144-524288-1048576',
      cidVersion: 0,
      hashAlg: 'sha2-256',
      pin: false,
      rawLeaves: false,
    }
  }
  const added = new Map()
  for await (const result of client.addAll(content, options)) {
    if (result === undefined || result == null) {
      const err = new Error('IPFS returned an unknown result...')
      err.name = 'IPFSUnknownResult'
      throw err
    }
    var cid = null
    if (result.cid !== undefined && result.cid !== null) {
      cid = result.cid
    }
    var path = null
    if (result.path !== undefined && result.path !== null) {
      path = result.path
    }
    const mode = result.mode
    const mtime = result.mtime
    var size = null
    if (result.size !== undefined && result.size !== null) {
      size = result.size
    }
    if (cid == null || path == null || size == null) {
      const err = new Error('IPFS returned an unknown result...')
      err.name = 'IPFSUnknownResult'
      throw err
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

IpfsLibrary.prototype.analyzePinType = function (type) {
  type = type !== undefined && type !== null && type.trim() !== '' ? type.trim() : null
  if (type == null) {
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

IpfsLibrary.prototype.dagGet = async function (client, cid, options) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  cid = cid !== undefined && cid !== null && cid.toString().trim() !== '' ? new CID(cid.toString().trim()) : null
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['dag'] })
  }
  if (client === undefined || client.dag === undefined || client.dag.get === undefined) {
    throw new Error('Undefined IPFS dag get...')
  }
  if (options === undefined || options == null) {
    options = {
      localResolve: false,
    }
  }
  const result = await client.dag.get(cid, options)
  if (result === undefined || result == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  return result
}

// https://discuss.ipfs.io/t/what-is-the-data-in-object/5221
// https://github.com/ipfs/go-unixfs/blob/master/pb/unixfs.pb.go
IpfsLibrary.prototype.dagPut = async function (client, dagNode, options) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  if (dagNode === undefined || dagNode == null) {
    throw new Error('Undefined DAG node...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['dag'] })
  }
  if (client === undefined || client.dag === undefined || client.dag.put === undefined) {
    throw new Error('Undefined IPFS dag put...')
  }
  if (options === undefined || options == null) {
    options = {
      format: 'dag-pb',
      hashAlg: 'sha2-256',
      pin: false,
    }
  }
  const result = await client.dag.put(dagNode, options)
  if (result === undefined || result == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  const stat = await this.objectStat(client, result, options.timeout)
  const cidV1 = this.ipfsBundle.cidToCidV1(result)
  return {
    cid: `${cidV1}`,
    size: stat.CumulativeSize,
  }
}

IpfsLibrary.prototype.dagResolve = async function (client, ipfsPath, timeout) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.trim() !== '' ? ipfsPath.trim() : null
  if (ipfsPath == null) {
    throw new Error('Undefined IPFS path...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['dag'] })
  }
  if (client === undefined || client.dag === undefined || client.dag.resolve === undefined) {
    throw new Error('Undefined IPFS dag resolve...')
  }
  timeout = timeout !== undefined && timeout !== null ? timeout : null
  var result = null
  if (timeout == null) {
    result = await client.dag.resolve(ipfsPath)
  } else {
    result = await client.dag.resolve(ipfsPath, {
      timeout: timeout,
    })
  }
  if (result === undefined || result == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  var cid = null
  if (result.cid !== undefined && result.cid !== null) {
    cid = result.cid
  }
  var remainderPath = null
  if (result.remainderPath !== undefined && result.remainderPath !== null) {
    remainderPath = result.remainderPath
  }
  if (cid == null || remainderPath == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  const cidV1 = this.ipfsBundle.cidToCidV1(cid)
  return {
    cid: cidV1,
    remainderPath: remainderPath,
  }
}

IpfsLibrary.prototype.filesStat = async function (client, ipfsPath, timeout) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.trim() !== '' ? ipfsPath.trim() : null
  if (ipfsPath == null) {
    throw new Error('Undefined IPFS path...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['files'] })
  }
  if (client === undefined || client.files === undefined || client.files.stat === undefined) {
    throw new Error('Undefined IPFS files stat...')
  }
  timeout = timeout !== undefined && timeout !== null ? timeout : null
  var result = null
  if (timeout == null) {
    result = await client.files.stat(ipfsPath)
  } else {
    result = await client.files.stat(ipfsPath, {
      timeout: timeout,
    })
  }
  if (result === undefined || result == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
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
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  if (withLocality) {
    if (local == null || sizeLocal == null) {
      const err = new Error('IPFS returned an unknown result...')
      err.name = 'IPFSUnknownResult'
      throw err
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

// https://github.com/ipfs/interface-js-ipfs-core/blob/master/SPEC/KEY.md#keygen
// https://github.com/libp2p/js-libp2p-crypto/issues/145
IpfsLibrary.prototype.genKey = async function (client, ipnsName) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  ipnsName = ipnsName !== undefined && ipnsName !== null && ipnsName.trim() !== '' ? ipnsName.trim() : null
  if (ipnsName == null) {
    throw new Error('Undefined IPNS name...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['key'] })
  }
  if (client === undefined || client.key === undefined || client.key.gen === undefined) {
    throw new Error('Undefined IPFS key gen...')
  }
  const key = await client.key.gen(ipnsName, {
    type: 'ed25519',
  })
  if (key === undefined || key == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  var keyId = null
  if (key.id !== undefined && key.id !== null) {
    keyId = key.id
  }
  if (keyId == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  return keyId
}

IpfsLibrary.prototype.get = async function (client, ipfsPath, timeout) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.trim() !== '' ? ipfsPath.trim() : null
  if (ipfsPath == null) {
    throw new Error('Undefined IPFS path...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['get'] })
  }
  if (client === undefined || client.get === undefined) {
    throw new Error('Undefined IPFS get...')
  }
  timeout = timeout !== undefined && timeout !== null ? timeout : null
  const content = []
  if (timeout == null) {
    for await (const file of client.get(ipfsPath)) {
      if (file.content === undefined || file.content == null) {
        const err = new Error('IPFS returned an unknown result...')
        err.name = 'IPFSUnknownResult'
        throw err
      }
      for await (const chunk of file.content) {
        content.push(chunk)
      }
    }
  } else {
    for await (const file of client.get(ipfsPath, { timeout: timeout })) {
      if (file.content === undefined || file.content == null) {
        const err = new Error('IPFS returned an unknown result...')
        err.name = 'IPFSUnknownResult'
        throw err
      }
      for await (const chunk of file.content) {
        content.push(chunk)
      }
    }
  }
  return content
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
  apiUrl = apiUrl !== undefined && apiUrl !== null && apiUrl.toString().trim() !== '' ? apiUrl : null
  if (apiUrl == null) {
    throw new Error('Undefined IPFS API URL...')
  }
  if (apiUrl instanceof URL === false) {
    apiUrl = this.ipfsBundle.getUrl(apiUrl)
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
            timeout: 4 * 60 * 1000,
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

IpfsLibrary.prototype.isIpfsDirectory = async function (client, cid, timeout) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  cid = cid !== undefined && cid !== null && cid.toString().trim() !== '' ? new CID(cid.toString().trim()) : null
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  timeout = timeout !== undefined && timeout !== null ? timeout : null
  var stat = null
  if (timeout == null) {
    stat = await this.objectStat(client, cid)
  } else {
    stat = await this.objectStat(client, cid, timeout)
  }
  if (stat.DataSize === 2) {
    var ua = null
    if (timeout == null) {
      ua = await this.objectData(client, cid)
    } else {
      ua = await this.objectData(client, cid, timeout)
    }
    if (ua.byteLength !== dagDirectory.byteLength) return false
    return ua.every((val, i) => val === dagDirectory[i])
  }
  return false
}

IpfsLibrary.prototype.keyList = async function (client) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['key'] })
  }
  if (client === undefined || client.key === undefined || client.key.list === undefined) {
    throw new Error('Undefined IPFS key list...')
  }
  const result = await client.key.list()
  if (result === undefined || result == null || Array.isArray(result) === false) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  return result
}

IpfsLibrary.prototype.keyRename = async function (client, oldIpnsName, newIpnsName) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  oldIpnsName = (oldIpnsName !== undefined && oldIpnsName !== null) || oldIpnsName.trim() !== '' ? oldIpnsName.trim() : null
  if (oldIpnsName == null) {
    throw new Error('Undefined Old IPNS name...')
  }
  newIpnsName = newIpnsName !== undefined && newIpnsName !== null && newIpnsName.trim() !== '' ? newIpnsName.trim() : null
  if (newIpnsName == null) {
    throw new Error('Undefined New IPNS name...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['key'] })
  }
  if (client === undefined || client.key === undefined || client.key.rename === undefined) {
    throw new Error('Undefined IPFS key rename...')
  }
  const key = await client.key.rename(oldIpnsName, newIpnsName)
  if (key === undefined || key == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
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
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  return {
    keyId: keyId,
    was: was,
    now: now,
    overwrite: overwrite,
  }
}

IpfsLibrary.prototype.ls = async function (client, ipfsPath) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  ipfsPath = ipfsPath !== undefined && ipfsPath !== null && ipfsPath.trim() !== '' ? ipfsPath.trim() : null
  if (ipfsPath == null) {
    throw new Error('Undefined IPFS path...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['ls'] })
  }
  if (client === undefined || client.ls === undefined) {
    throw new Error('Undefined IPFS ls...')
  }
  const content = new Map()
  for await (const result of client.ls(ipfsPath)) {
    if (result === undefined || result == null) {
      const err = new Error('IPFS returned an unknown result...')
      err.name = 'IPFSUnknownResult'
      throw err
    }
    var cid = null
    if (result.cid !== undefined && result.cid !== null) {
      cid = result.cid
    }
    var depth = null
    if (result.depth !== undefined && result.depth !== null) {
      depth = result.depth
    }
    const mode = result.mode
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
    if (cid == null || depth == null || name == null || path == null || size == null || type == null) {
      const err = new Error('IPFS returned an unknown result...')
      err.name = 'IPFSUnknownResult'
      throw err
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

IpfsLibrary.prototype.namePublish = async function (client, ipnsName, cid, options) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  ipnsName = ipnsName !== undefined && ipnsName !== null && ipnsName.trim() !== '' ? ipnsName.trim() : null
  if (ipnsName == null) {
    throw new Error('Undefined IPNS name...')
  }
  cid = cid !== undefined && cid !== null && cid.toString().trim() !== '' ? new CID(cid.toString().trim()) : null
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['name'] })
  }
  if (client === undefined || client.name === undefined || client.name.publish === undefined) {
    throw new Error('Undefined IPFS name publish...')
  }
  if (options === undefined || options == null) {
    options = {
      resolve: false,
      key: ipnsName,
      allowOffline: false,
    }
  }
  const result = await client.name.publish(cid, options)
  if (result === undefined || result == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
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
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  return {
    name: name,
    value: value,
  }
}

IpfsLibrary.prototype.nameResolve = async function (client, value, options) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  value = value !== undefined && value !== null && value.trim() !== '' ? value.trim() : null
  if (value == null) {
    throw new Error('Undefined IPNS address...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['name'] })
  }
  if (client === undefined || client.name === undefined || client.name.resolve === undefined) {
    throw new Error('Undefined IPFS name resolve...')
  }
  if (options === undefined || options == null) {
    options = {
      nocache: false,
      recursive: true,
    }
  }
  const resolvedPaths = await client.name.resolve(value, options)
  if (resolvedPaths === undefined || resolvedPaths == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  var lastPath = null
  // https://gist.github.com/alanshaw/04b2ddc35a6fff25c040c011ac6acf26
  for await (const path of resolvedPaths) {
    lastPath = path !== undefined || path !== null ? path : null
  }
  if (lastPath == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  return lastPath
}

IpfsLibrary.prototype.objectData = async function (client, cid, timeout) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  cid = cid !== undefined && cid !== null && cid.toString().trim() !== '' ? new CID(cid.toString().trim()) : null
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['object'] })
  }
  if (client === undefined || client.object === undefined || client.object.data === undefined) {
    throw new Error('Undefined IPFS object data...')
  }
  timeout = timeout !== undefined && timeout !== null ? timeout : null
  var ua = null
  if (timeout == null) {
    ua = await client.object.data(cid)
  } else {
    ua = await client.object.data(cid, {
      timeout: timeout,
    })
  }
  if (ua === undefined || ua == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  return ua
}

IpfsLibrary.prototype.objectStat = async function (client, cid, timeout) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  cid = cid !== undefined && cid !== null && cid.toString().trim() !== '' ? new CID(cid.toString().trim()) : null
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['object'] })
  }
  if (client === undefined || client.object === undefined || client.object.stat === undefined) {
    throw new Error('Undefined IPFS object stat...')
  }
  timeout = timeout !== undefined && timeout !== null ? timeout : null
  var stat = null
  if (timeout == null) {
    stat = await client.object.stat(cid)
  } else {
    stat = await client.object.stat(cid, {
      timeout: timeout,
    })
  }
  if (stat === undefined || stat == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  var Hash = null
  if (stat.Hash !== undefined && stat.Hash !== null) {
    Hash = stat.Hash
  }
  var NumLinks = null
  if (stat.NumLinks !== undefined && stat.NumLinks !== null) {
    NumLinks = stat.NumLinks
  }
  var BlockSize = null
  if (stat.BlockSize !== undefined && stat.BlockSize !== null) {
    BlockSize = stat.BlockSize
  }
  var LinksSize = null
  if (stat.LinksSize !== undefined && stat.LinksSize !== null) {
    LinksSize = stat.LinksSize
  }
  var DataSize = null
  if (stat.DataSize !== undefined && stat.DataSize !== null) {
    DataSize = stat.DataSize
  }
  var CumulativeSize = null
  if (stat.CumulativeSize !== undefined && stat.CumulativeSize !== null) {
    CumulativeSize = stat.CumulativeSize
  }
  if (Hash == null || NumLinks == null || BlockSize == null || LinksSize == null || DataSize == null || CumulativeSize == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  const cidV1 = this.ipfsBundle.cidToCidV1(Hash)
  return {
    Hash: cidV1,
    NumLinks: NumLinks,
    BlockSize: BlockSize,
    LinksSize: LinksSize,
    DataSize: DataSize,
    CumulativeSize: CumulativeSize,
  }
}

IpfsLibrary.prototype.pinAdd = async function (client, cid, options) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  cid = cid !== undefined && cid !== null && cid.toString().trim() !== '' ? new CID(cid.toString().trim()) : null
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['pin'] })
  }
  if (client === undefined || client.pin === undefined || client.pin.add === undefined) {
    throw new Error('Undefined IPFS pin add...')
  }
  if (options === undefined || options == null) {
    options = {
      recursive: true,
    }
  }
  const result = await client.pin.add(cid, options)
  if (result === undefined || result == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  return this.ipfsBundle.cidToCidV1(result, 'ipfs', true)
}

IpfsLibrary.prototype.pinRm = async function (client, cid, options) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  cid = cid !== undefined && cid !== null && cid.toString().trim() !== '' ? new CID(cid.toString().trim()) : null
  if (cid == null) {
    throw new Error('Undefined IPFS identifier...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['pin'] })
  }
  if (client === undefined || client.pin === undefined || client.pin.rm === undefined) {
    throw new Error('Undefined IPFS pin rm...')
  }
  if (options === undefined || options == null) {
    options = {
      recursive: true,
    }
  }
  const result = await client.pin.rm(cid, options)
  if (result === undefined || result == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  return this.ipfsBundle.cidToCidV1(result, 'ipfs', true)
}

IpfsLibrary.prototype.rmKey = async function (client, ipnsName) {
  if (client === undefined || client == null) {
    throw new Error('Undefined IPFS provider...')
  }
  ipnsName = ipnsName !== undefined && ipnsName !== null && ipnsName.trim() !== '' ? ipnsName.trim() : null
  if (ipnsName == null) {
    throw new Error('Undefined IPNS name...')
  }
  if (client.enable) {
    client = await client.enable({ commands: ['key'] })
  }
  if (client === undefined || client.key === undefined || client.key.rm === undefined) {
    throw new Error('Undefined IPFS key rm...')
  }
  const key = await client.key.rm(ipnsName)
  if (key === undefined || key == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  var keyId = null
  if (key.id !== undefined && key.id !== null) {
    keyId = key.id
  }
  if (keyId == null) {
    const err = new Error('IPFS returned an unknown result...')
    err.name = 'IPFSUnknownResult'
    throw err
  }
  return keyId
}

exports.IpfsLibrary = IpfsLibrary
