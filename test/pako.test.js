/*eslint no-unused-vars:"off"*/
/*global jest,beforeAll,describe,it,expect*/
'use strict'

const fs = require('fs')
const pako = require('pako')

const IpfsBundle = require('../build/plugins/ipfs/ipfs-bundle.js').IpfsBundle

beforeAll(() => {})

describe('Deflate', () => {
  it('deflate', async () => {
    const plain = fs.readFileSync('./test/data/plain.txt')
    const ua = pako.deflate(plain.toString(), { raw: false })
    const b64 = Buffer.from(ua).toString('base64')
    const compressed = fs.readFileSync('./test/data/compressed.txt')
    expect(b64 === compressed.toString()).toBeTruthy()
  })
})

describe('Inflate', () => {
  it('inflate', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const b64 = fs.readFileSync('./test/data/compressed.txt')
    const ua = ipfsBundle.decode(b64.toString())
    const content = pako.inflate(ua, { to: 'string' })
    const plain = fs.readFileSync('./test/data/plain.txt')
    expect(content === plain.toString()).toBeTruthy()
  })
})
