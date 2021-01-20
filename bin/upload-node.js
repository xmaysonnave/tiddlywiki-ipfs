#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const dotenv = require('dotenv')
const fetch = require('node-fetch')
const fileType = require('file-type')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const { pipeline } = require('stream')
const { promisify } = require('util')
const CID = require('cids')
const uint8ArrayFromString = require('uint8arrays/from-string')

function getExtension (filename) {
  return filename.split('.').pop()
}

async function load (url, stream) {
  if (url instanceof URL === false) {
    url = new URL(url)
  }
  const options = {
    compress: false,
    method: 'GET',
  }
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`unexpected response ${response.statusText}`)
  }
  if (stream) {
    const streamPipeline = promisify(pipeline)
    await streamPipeline(response.body, stream)
    return
  }
  const buffer = await response.buffer()
  return await fileType.fromBuffer(buffer)
}

// https://discuss.ipfs.io/t/what-is-the-data-in-object/5221
// https://github.com/ipfs/go-unixfs/blob/master/pb/unixfs.pb.go
async function dagPut (api, gatewayUrl, links) {
  const cid = await api.dag.put(
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
  const stat = await api.object.stat(cid)
  return {
    _cid: `${cid}`,
    _cid_size: stat.CumulativeSize,
    _cid_uri: `${gatewayUrl}${cid}`,
  }
}

/*
 * https://infura.io/docs
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

module.exports = async function main (dir) {
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  dir = dir == null || dir === undefined || dir.trim() === '' ? null : dir.trim()
  if (dir == null) {
    throw new Error('Unknown directory...')
  }
  const options = {
    chunker: 'rabin-262144-524288-1048576',
    cidVersion: 0,
    hashAlg: 'sha2-256',
    pin: false,
    rawLeaves: false,
    wrapWithDirectory: false,
  }
  // Ipfs Client
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
    timeout: '4m',
  })
  const gatewayUrl = process.env.IPFS_GATEWAY ? `${process.env.IPFS_GATEWAY}/ipfs/` : 'https://dweb.link/ipfs/'
  // Read sub directory current.json or node.json
  const links = []
  const nodes = new Map()
  const content = fs.readdirSync(`./current/${dir}`).sort((a, b) => {
    return a.localeCompare(b)
  })
  for (var i = 0; i < content.length; i++) {
    try {
      if (fs.statSync(`./current/${dir}/${content[i]}`).isDirectory()) {
        // Current
        var path = `./current/${dir}/${content[i]}/current.json`
        if (fs.existsSync(path)) {
          const current = JSON.parse(fs.readFileSync(path, 'utf8'))
          if (current) {
            if (!Array.isArray(current)) {
              throw new Error(`Array expected: ${path}...`)
            }
          }
          if (current && current.length === 1) {
            links.push({
              Name: content[i],
              Tsize: current[0]._parent_size,
              Hash: new CID(current[0]._parent_cid),
            })
          } else {
            const innerLinks = []
            const innerContent = fs.readdirSync(`./production/${dir}/${content[i]}`).sort((a, b) => {
              return a.localeCompare(b)
            })
            for (var j = 0; j < innerContent.length; j++) {
              var found = null
              for (var k = 0; k < current.length; k++) {
                if (current[k]._source_path === innerContent[j]) {
                  found = current[k]
                  break
                }
              }
              if (found) {
                innerLinks.push({
                  Name: found._source_path,
                  Tsize: found._source_size,
                  Hash: new CID(found._cid),
                })
              } else {
                if (getExtension(innerContent[j]) === 'tid') {
                  const loaded = fs.readFileSync(`./production/${dir}/${content[i]}/${innerContent[j]}`)
                  const result = await api.add(
                    {
                      path: `/${innerContent[j]}`,
                      content: loaded,
                    },
                    options
                  )
                  if (!result) {
                    throw new Error('IPFS client returned an unknown result...')
                  }
                  innerLinks.push({
                    Name: innerContent[j],
                    Tsize: result.size,
                    Hash: result.cid,
                  })
                }
              }
            }
            const node = await dagPut(api, gatewayUrl, innerLinks)
            links.push({
              Name: content[i],
              Tsize: node._cid_size,
              Hash: new CID(node._cid),
            })
          }
        }
        // Node
        path = `./current/${dir}/${content[i]}/node.json`
        if (fs.existsSync(path)) {
          const node = JSON.parse(fs.readFileSync(path, 'utf8'))
          links.push({
            Name: content[i],
            Tsize: node._cid_size,
            Hash: new CID(node._cid),
          })
          nodes.set(path, node)
        }
      }
    } catch (error) {
      console.error(error)
    }
  }
  // Node
  const node = await dagPut(api, gatewayUrl, links)
  // Root Node
  if (dir === '.') {
    const path = './current/build.json'
    if (fs.existsSync(path)) {
      const build = JSON.parse(fs.readFileSync(path, 'utf8'))
      const buildNode = await dagPut(api, gatewayUrl, [
        {
          Name: build._version,
          Tsize: node._cid_size,
          Hash: new CID(node._cid),
        },
      ])
      node._parent_cid = buildNode._cid
      node._parent_size = buildNode._cid_size
      node._parent_uri = buildNode._cid_uri
      node._source_path = build._version
      node._source_size = node._cid_size
      node._source_uri = `${gatewayUrl}${buildNode._cid}/${build._version}`
    }
    delete node._cid_size
  }
  // Save node
  fs.writeFileSync(`./current/${dir}/node.json`, beautify(node, null, 2, 80), 'utf8')
  // Update child nodes
  for (const [key, value] of nodes) {
    value._parent_cid = node._parent_cid
    value._parent_size = node._parent_size
    value._parent_uri = node._parent_uri
    // Save child node
    fs.writeFileSync(key, beautify(value, null, 2, 80), 'utf8')
  }
  // Load
  if (node._parent_uri) {
    await load(node._parent_uri)
    console.log(`*** Fetched ${node._parent_uri} ***`)
  }
  if (node._source_uri) {
    await load(node._source_uri)
    console.log(`*** Fetched ${node._source_uri} ***`)
  }
  await load(node._cid_uri)
  console.log(`*** Fetched ${node._cid_uri} ***`)
  // Load links
  for (var i = 0; i < links.length; i++) {
    const link = links[i]
    var uri = `${gatewayUrl}${node._cid}/${link.Name}`
    await load(uri)
    console.log(`*** Fetched ${uri} ***`)
    var uri = `${gatewayUrl}${link.Hash}`
    await load(uri)
    console.log(`*** Fetched ${uri} ***`)
  }
}
