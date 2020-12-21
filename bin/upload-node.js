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

async function load (url, stream) {
  if (url instanceof URL === false) {
    url = new URL(url)
  }
  var options = {
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

// TODO: HashOnly
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

module.exports = async function main (dir, hashOnly) {
  const dotEnv = dotenv.config()
  if (dotEnv.error) {
    throw dotEnv.error
  }
  dir = dir == null || dir === undefined || dir.trim() === '' ? null : dir.trim()
  if (dir == null) {
    throw new Error('Unknown directory...')
  }
  hashOnly = hashOnly == null || hashOnly === undefined || hashOnly.trim() === '' ? null : hashOnly.trim()
  hashOnly = hashOnly ? hashOnly === 'true' : process.env.HASH_ONLY ? process.env.HASH_ONLY === 'true' : true
  // Read sub directory current.json or node.json
  const links = []
  const content = fs.readdirSync(`./current/${dir}`).sort()
  for (var i = 0; i < content.length; i++) {
    try {
      if (fs.statSync(`./current/${dir}/${content[i]}`).isDirectory()) {
        var path = `./current/${dir}/${content[i]}/current.json`
        if (fs.existsSync(path)) {
          const current = JSON.parse(fs.readFileSync(path, 'utf8'))
          links.push({
            Name: content[i],
            Tsize: current._parent_size,
            Hash: new CID(current._parent_cid),
          })
        }
        var path = `./current/${dir}/${content[i]}/node.json`
        if (fs.existsSync(path)) {
          const node = JSON.parse(fs.readFileSync(path, 'utf8'))
          links.push({
            Name: content[i],
            Tsize: node._cid_size,
            Hash: new CID(node._cid),
          })
        }
      }
    } catch (error) {
      console.error(error)
    }
  }
  // Ipfs Client
  const apiUrl = process.env.API ? process.env.API : 'https://ipfs.infura.io:5001'
  const api = IpfsHttpClient(apiUrl)
  const gatewayUrl = process.env.GATEWAY ? `${process.env.GATEWAY}/ipfs/` : 'https://dweb.link/ipfs/'
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
      node._parent_parent = buildNode._cid_size
      node._parent_uri = buildNode._cid_uri
      node._source_path = build._version
      node._source_size = node._cid_size
      node._source_uri = `${gatewayUrl}${buildNode._cid}/${build._version}`
    }
  }
  // Save node
  fs.writeFileSync(`./current/${dir}/node.json`, beautify(node, null, 2, 80), 'utf8')
  // Fetch
  if (!hashOnly) {
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
  }
}
