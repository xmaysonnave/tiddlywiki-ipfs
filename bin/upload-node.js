#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const dotenv = require('dotenv')
const fetch = require('node-fetch')
const fileType = require('file-type')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const path = require('path')
const { pipeline } = require('stream')
const { promisify } = require('util')
const CID = require('cids')
const uint8ArrayFromString = require('uint8arrays/from-string')

const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle
const ipfsBundle = new IpfsBundle()

async function loadFromIpfs (url, stream) {
  if (url instanceof URL === false) {
    url = new URL(url)
  }
  const options = {
    compress: false,
    method: 'GET',
  }
  const response = await fetch(url, options)
  if (response.ok === false) {
    throw new Error(`unexpected response ${response.statusText}`)
  }
  if (stream !== undefined && stream !== null) {
    const streamPipeline = promisify(pipeline)
    await streamPipeline(response.body, stream)
    return
  }
  const buffer = await response.buffer()
  return await fileType.fromBuffer(buffer)
}

// https://discuss.ipfs.io/t/what-is-the-data-in-object/5221
// https://github.com/ipfs/go-unixfs/blob/master/pb/unixfs.pb.go
async function dagPut (api, links) {
  const put = await api.dag.put(
    {
      Data: uint8ArrayFromString('\u0008\u0001'),
      Links: links,
    },
    {
      format: 'dag-pb',
      hashAlg: 'sha2-256',
      pin: false,
    }
  )
  if (put === undefined || put == null) {
    throw new Error('IPFS returned an unknown result...')
  }
  var size = null
  var stat = null
  try {
    stat = await api.object.stat(put)
    size = stat.CumulativeSize
  } catch (error) {
    // Ignore
  }
  const cidV1 = ipfsBundle.cidToCidV1(put)
  return {
    _cid: `${cidV1}`,
    _size: size,
  }
}

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = async function main (dir, load) {
  // Init
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  ipfsBundle.init()
  // Params
  dir = dir !== undefined && dir !== null && dir.trim() !== '' ? dir.trim() : null
  if (dir == null) {
    throw new Error('Unknown directory...')
  }
  load = load ? load === 'true' : process.env.LOAD ? process.env.LOAD === 'true' : true
  // Ipfs
  const options = {
    chunker: 'rabin-262144-524288-1048576',
    cidVersion: 0,
    hashAlg: 'sha2-256',
    pin: false,
    rawLeaves: false,
    wrapWithDirectory: false,
  }
  const apiUrl = new URL(process.env.IPFS_API ? process.env.IPFS_API : 'https://ipfs.infura.io:5001')
  const protocol = apiUrl.protocol.slice(0, -1)
  var port = apiUrl.port
  if (port === undefined || port == null || port.trim() === '') {
    port = 443
    if (protocol === 'http') {
      port = 80
    }
  }
  const api = IpfsHttpClient({
    protocol: protocol,
    host: apiUrl.hostname,
    port: port,
    timeout: 2 * 60 * 1000,
  })
  const gateway = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}/ipfs/` : 'https://dweb.link/ipfs/'
  var publicGateway = process.env.PUBLIC_GATEWAY ? `${process.env.PUBLIC_GATEWAY}/ipfs/` : null
  if (publicGateway == null) {
    publicGateway = gateway
  }
  // Read sub directory current.json or node.json
  const links = []
  const nodes = new Map()
  const content = fs.readdirSync(`./current/${dir}`)
  for (var i = 0; i < content.length; i++) {
    try {
      const currentPath = `./current/${dir}/${content[i]}`
      const productionPath = `./production/${dir}/${content[i]}`
      const jsonPath = `${currentPath}/current.json`
      const nodePath = `${currentPath}/node.json`
      if (fs.existsSync(jsonPath) && fs.existsSync(productionPath)) {
        const current = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
        if (current === undefined || current == null) {
          throw new Error(`Unknown current: ${jsonPath}`)
        }
        if (Array.isArray(current) === false) {
          throw new Error(`Unexpected current content: ${jsonPath}`)
        }
        const productionLinks = []
        const production = fs.readdirSync(productionPath).sort((a, b) => {
          return a.localeCompare(b)
        })
        for (var j = 0; j < production.length; j++) {
          var sourceUri = null
          const sourceFile = path.parse(production[j])
          for (var k = 0; k < current.length; k++) {
            if (sourceFile.ext !== '.tid') {
              if (current[k].title === sourceFile.name || current[k].title === content[i]) {
                sourceUri = current[k]._source_uri
                break
              }
            }
          }
          if (sourceUri !== null) {
            const { cid: sourceCid } = await ipfsBundle.resolveIpfs(api, sourceUri)
            const stat = await ipfsBundle.objectStat(api, sourceCid)
            productionLinks.push({
              Name: sourceFile.base,
              Tsize: stat.CumutativeSize,
              Hash: new CID(sourceCid),
            })
          } else if (sourceFile.ext === '.tid') {
            const loaded = fs.readFileSync(`./production/${dir}/${content[i]}/${sourceFile.base}`)
            const added = await api.add(
              {
                path: `/${sourceFile.base}`,
                content: loaded,
              },
              options
            )
            if (added === undefined || added == null) {
              throw new Error('IPFS returned an unknown result...')
            }
            const cidV1 = ipfsBundle.cidToCidV1(added.cid)
            productionLinks.push({
              Name: production[j],
              Tsize: added.size,
              Hash: new CID(cidV1),
            })
          }
        }
        productionLinks.sort((a, b) => {
          return a.Name.localeCompare(b.Name)
        })
        const node = await dagPut(api, productionLinks)
        links.push({
          Name: content[i],
          Tsize: node._size,
          Hash: new CID(node._cid),
        })
      } else if (fs.existsSync(nodePath)) {
        const node = JSON.parse(fs.readFileSync(nodePath, 'utf8'))
        if (node === undefined || node == null) {
          throw new Error(`Unknown node: ${nodePath}...`)
        }
        const parentCid = await ipfsBundle.resolveIpfsContainer(api, node._source_uri)
        const stat = await ipfsBundle.objectStat(api, parentCid)
        links.push({
          Name: content[i],
          Tsize: stat.CumutativeSize,
          Hash: new CID(parentCid),
        })
        nodes.set(nodePath, node)
      }
    } catch (error) {
      console.error(error)
    }
  }
  // Node
  var rootNode = null
  const node = {}
  const currentNode = await dagPut(api, links)
  if (dir === '.') {
    const path = './current/build.json'
    if (fs.existsSync(path)) {
      const build = JSON.parse(fs.readFileSync(path, 'utf8'))
      rootNode = await dagPut(api, [
        {
          Name: build._version,
          Tsize: currentNode._size,
          Hash: new CID(currentNode._cid),
        },
      ])
      node._source_size = rootNode._size
      node._source_uri = `${publicGateway}${rootNode._cid}/`
    }
  } else {
    node._source_size = currentNode._size
    node._source_uri = `${publicGateway}${currentNode._cid}/`
  }
  // Log
  console.log('***')
  if (rootNode) {
    console.log(`*** Added root node ***
 ipfs://${rootNode._cid}/`)
  }
  console.log(`*** Added node ./current/${dir} ***
 ipfs://${currentNode._cid}/`)
  // Save node
  fs.writeFileSync(`./current/${dir}/node.json`, beautify(node, null, 2, 80), 'utf8')
  // Update child nodes
  for (const [key, value] of nodes) {
    value._parent_size = currentNode._size
    value._parent_uri = currentNode._uri
    fs.writeFileSync(key, beautify(value, null, 2, 80), 'utf8')
  }
  // Load
  if (load) {
    const currentNodeUri = `${gateway}${currentNode._cid}/`
    await loadFromIpfs(currentNodeUri)
    console.log(`*** Fetched ***
  ${currentNodeUri} ***`)
    if (rootNode !== null) {
      const rootNodeUri = `${gateway}${rootNode._cid}/`
      await loadFromIpfs(rootNodeUri)
      console.log(`*** Fetched ***
  ${rootNodeUri} ***`)
    }
  }
}
