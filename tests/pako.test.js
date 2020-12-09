/*eslint no-unused-expressions:"off"*/
/*eslint no-undef:"off"*/
;('use strict')

const fs = require('fs')
const pako = require('pako')
const chai = require('chai')
const IpfsBundle = require('../core/modules/ipfs-bundle.js').IpfsBundle

const { expect } = chai

describe('Deflate', () => {
  it('deflate', async () => {
    const plain = fs.readFileSync('./tests/data/plain.txt')
    const ua = pako.deflate(plain.toString(), { raw: false })
    const b64 = Buffer.from(ua).toString('base64')
    const compressed = fs.readFileSync('./tests/data/compressed.txt')
    expect(b64 === compressed.toString()).to.be.true
  })
})

describe('Inflate', () => {
  it('inflate', async () => {
    const ipfsBundle = new IpfsBundle()
    ipfsBundle.init()
    const b64 = fs.readFileSync('./tests/data/compressed.txt')
    const ua = ipfsBundle.decode(b64.toString())
    const content = pako.inflate(ua, { to: 'string' })
    const plain = fs.readFileSync('./tests/data/plain.txt')
    expect(content === plain.toString()).to.be.true
  })
})
