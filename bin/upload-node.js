#!/usr/bin/env node
'use strict'

const beautify = require('json-beautify')
const dotenv = require('dotenv')
const fs = require('fs')
const IpfsHttpClient = require('ipfs-http-client')
const CID = require('cids')

/*
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
  // Read content
  const content = fs.readdirSync(`./current/${dir}`).sort()
  const upload = []
  for (var i = 0; i < content.length; i++) {
    try {
      if (fs.statSync(`./current/${dir}/${content[i]}`).isDirectory()) {
        const current = fs.readFileSync(`./current/${dir}/${content[i]}/current.json`)
        const jsonObject = JSON.parse(current)
        upload.push({
          name: content[i],
          cid: new CID(jsonObject._parent_cid),
        })
      }
    } catch (error) {
      console.error(error)
    }
  }
  // Ipfs Client
  const apiUrl = process.env.API ? process.env.API : 'https://ipfs.infura.io:5001'
  const api = IpfsHttpClient(apiUrl)
  const gatewayUrl = process.env.GATEWAY ? process.env.GATEWAY : 'https://dweb.link'
  // Build Directory
  const options = {
    chunker: 'rabin-262144-524288-1048576',
    cidVersion: 0,
    hashAlg: 'sha2-256',
    pin: false,
    rawLeaves: false,
  }
  if (hashOnly) {
    options.onlyHash = true
  }
  var node = await api.add(
    {
      path: '/',
    },
    options
  )
  var cid = node.cid
  for (var i = 0; i < upload.length; i++) {
    cid = await api.object.patch.addLink(cid, upload[i])
  }
  // Json
  const toJson = {
    _cid: cid.toString(),
    _cid_uri: `${gatewayUrl}/ipfs/${cid}`,
  }
  // Save current
  fs.writeFileSync(`./current/${dir}/current.json`, beautify(toJson, null, 2, 80), 'utf8')
}
