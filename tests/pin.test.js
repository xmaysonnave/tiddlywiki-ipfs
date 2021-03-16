/*eslint no-unused-expressions:"off"*/
/*eslint no-undef:"off"*/
;('use strict')

const fs = require('fs')
const fse = require('fs-extra')
const CID = require('cids')
const IPFS = require('ipfs')
const Repo = require('ipfs-repo')
const chai = require('chai')
const IpfsBundle = require('../core/modules/library/ipfs-bundle.js').IpfsBundle

/*
 * https://infura.io/docs
 * https://cid.ipfs.io
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 **/

const { expect } = chai

async function start () {
  fs.rmSync('.ipfs', { recursive: true, force: true })
  fse.copySync('tests/repo', '.ipfs')
  api = await IPFS.create({
    repo: new Repo('.ipfs'),
  })
}

async function stop () {
  await api.stop()
}

const direct = 'direct'
const indirect = 'indirect'
const recursive = 'recursive'

const content = 'Hello world'
const contentCid = 'QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve'
const contentCidV1 = 'bafybeiabfiu2uipule2sro2maoufk2waokktnsbqp5gvaaod3y44ouft54'

const file1 = [
  {
    path: '/file1.txt',
    content: content,
  },
]
const parentFile1Cid = 'QmNpwpR6uMixTtnvXUEQ81K9HdMYzZV2KWS2B7fE3ELFec'
const parentFile1CidV1 = 'bafybeiahh6ny2krmaf5j5omwy5g2mpicyrpo4bwimrj7kznjdwioafjmyu'

const file2 = [
  {
    path: '/file2.txt',
    content: content,
  },
]
const parentFile2Cid = 'QmeCUpfcZvxDAQxkzn6kS1Cz2fPKuxz6pGoKc3zeDSP8rn'

const parentFile2CidWithLinkToFile1 = 'QmU5eoM1Cw7ohHPz4Cxjvagmt6W9jPzLCLVKBtmErpbm6z'
const parentFile2CidWithLinkToFile1V1 = 'bafybeicvj2bpkzptp7y5zbupaju3furnx4ygswfqyfiwtflwromed3ouvm'

const options = {
  chunker: 'rabin-262144-524288-1048576',
  cidVersion: 0,
  hashAlg: 'sha2-256',
  pin: false,
  hashOnly: false,
  rawLeaves: false,
  wrapWithDirectory: true,
}

const ipfsBundle = new IpfsBundle()

var api = null

before(() => {
  ipfsBundle.init()
})

beforeEach(() => {
  options.wrapWithDirectory = true
})

describe('Single', () => {
  before(async () => {
    await start()
  })
  it('Same content...', async () => {
    options.hashOnly = true
    options.wrapWithDirectory = false
    const { cid: hash } = await api.add(content, options)
    options.hashOnly = false
    const { cid } = await api.add(content, options)
    expect(hash.toString()).to.equal(cid.toString())
    expect(hash.toString()).to.equal(contentCid)
  })
  it('No pin...', async () => {
    options.wrapWithDirectory = false
    const { cid } = await api.add(content, options)
    const { cid: fetched } = await ipfsBundle.hasPin(api, cid)
    expect(fetched).to.equal('')
  })
  it(`Same content keep '${direct}' pin...`, async () => {
    options.wrapWithDirectory = false
    var { cid } = await api.add(content, options)
    var { cid: fetched } = await ipfsBundle.hasPin(api, cid)
    expect(fetched).to.equal('')
    const pinned = await api.pin.add(cid, {
      recursive: false,
    })
    expect(pinned.toString()).to.equal(cid.toString())
    var { cid: fetched, type } = await ipfsBundle.hasPin(api, cid, direct)
    expect(fetched.toString()).to.equal(contentCidV1)
    expect(type).to.equal(direct)
    var { cid } = await api.add(content, options)
    var { cid: fetched, type } = await ipfsBundle.hasPin(api, cid)
    expect(fetched.toString()).to.equal(contentCidV1)
    expect(type).to.equal(direct)
  })
  after(async () => {
    await stop()
  })
})

describe('Single wrapped', () => {
  before(async () => {
    await start()
  })
  it('Same content...', async () => {
    options.hashOnly = true
    const hash = await ipfsBundle.addAll(api, file1, options)
    options.hashOnly = false
    var hashFile = null
    var hashFilePath = null
    var hashParent = null
    for (const [key, value] of hash.entries()) {
      if (hashFile === null) {
        hashFile = key
        hashFilePath = value.path
      } else if (hashParent === null) {
        hashParent = key
      }
    }
    expect(hashFile.toString()).to.equal(contentCidV1)
    expect(hashFilePath).to.equal('file1.txt')
    expect(hashParent.toString()).to.equal(parentFile1CidV1)
    const content = await ipfsBundle.addAll(api, file1, options)
    for (const [key, value] of content.entries()) {
      if (hashFile !== null) {
        expect(key.toString()).to.equal(hashFile.toString())
        expect(key.toString()).to.equal(contentCidV1)
        expect(value.path).to.equal('file1.txt')
        hashFile = null
        hashFilePath = null
      } else if (hashParent === null) {
        expect(key).to.equal(hashParent)
        expect(key.toString()).to.equal(parentFile1CidV1)
      }
    }
  })
  it('No pin...', async () => {
    const content = await ipfsBundle.addAll(api, file1, options)
    for (const key of content.keys()) {
      const { cid: fetched } = await ipfsBundle.hasPin(api, key)
      expect(fetched).to.equal('')
    }
  })
  it(`Same content keep '${recursive}' pin...`, async () => {
    var content = await ipfsBundle.addAll(api, file1, options)
    for (const key of content.keys()) {
      const { cid } = await ipfsBundle.hasPin(api, key)
      expect(cid).to.equal('')
    }
    try {
      const pinned = await api.pin.add(parentFile1Cid, {
        recursive: true,
      })
      expect(pinned.toString()).to.equal(parentFile1Cid)
      var { cid: fetched, type } = await ipfsBundle.hasPin(api, parentFile1Cid, recursive)
      expect(fetched.toString()).to.equal(parentFile1CidV1)
      expect(type).to.equal(recursive)
      var { cid: fetched, parentCid, type } = await ipfsBundle.hasPin(api, parentFile1Cid, indirect, '/file1.txt')
      expect(fetched.toString()).to.equal(contentCidV1)
      expect(parentCid.toString()).to.equal(parentFile1CidV1)
      expect(type).to.equal(indirect)
      var { cid: fetched, type } = await ipfsBundle.hasPin(api, contentCid, indirect)
      expect(fetched.toString()).to.equal(contentCidV1)
      expect(type).to.equal(indirect)
    } catch (error) {
      console.error(error)
    }
  })
  after(async () => {
    await stop()
  })
})

describe(`Single '${direct}'`, () => {
  before(async () => {
    await start()
  })
  it(`pin '${direct}'...`, async () => {
    options.wrapWithDirectory = false
    const { cid } = await api.add(content, options)
    const pinned = await api.pin.add(cid, {
      recursive: false,
    })
    expect(pinned.toString()).to.equal(cid.toString())
    const { cid: fetched, type } = await ipfsBundle.hasPin(api, cid, direct)
    expect(fetched.toString()).to.equal(contentCidV1)
    expect(type).to.equal(direct)
  })
  it(`unpin '${direct}'..`, async () => {
    const unpinned = await ipfsBundle.pinRm(api, contentCid, { recursive: false })
    expect(unpinned.toString()).to.equal(contentCidV1)
    const { cid: fetched } = await ipfsBundle.hasPin(api, contentCid, direct)
    expect(fetched.toString()).to.equal('')
  })
  after(async () => {
    await stop()
  })
})

describe(`Single '${recursive}'`, () => {
  before(async () => {
    await start()
  })
  it(`pin '${recursive}'...`, async () => {
    options.wrapWithDirectory = false
    const { cid } = await api.add(content, options)
    const pinned = await api.pin.add(cid, {
      recursive: true,
    })
    expect(pinned.toString()).to.equal(cid.toString())
    const { cid: fetched, type } = await ipfsBundle.hasPin(api, cid, recursive)
    expect(fetched.toString()).to.equal(contentCidV1)
    expect(type).to.equal(recursive)
  })
  it(`unpin '${recursive}'...`, async () => {
    const unpinned = await ipfsBundle.pinRm(api, contentCid, { recursive: true })
    expect(unpinned.toString()).to.equal(contentCidV1)
    const { cid: fetched } = await ipfsBundle.hasPin(api, contentCid, recursive)
    expect(fetched.toString()).to.equal('')
  })
  after(async () => {
    await stop()
  })
})

describe(`Single '${direct}' pin and '${recursive}' unpin`, () => {
  before(async () => {
    await start()
  })
  it(`pin '${direct}'...`, async () => {
    options.wrapWithDirectory = false
    const { cid } = await api.add(content, options)
    const pinned = await api.pin.add(cid, {
      recursive: false,
    })
    expect(pinned.toString()).to.equal(cid.toString())
    const { cid: fetched, type } = await ipfsBundle.hasPin(api, cid, direct)
    expect(fetched.toString()).to.equal(contentCidV1.toString())
    expect(type).to.equal(direct)
  })
  it(`unpin '${recursive}'...`, async () => {
    // recursive unpin direct pin
    const unpinned = await ipfsBundle.pinRm(api, contentCid, { recursive: true })
    expect(unpinned.toString()).to.equal(contentCidV1)
    const { cid: fetched } = await ipfsBundle.hasPin(api, contentCid, direct)
    expect(fetched.toString()).to.equal('')
  })
  after(async () => {
    await stop()
  })
})

describe(`Single '${recursive}' pin and '${direct}' unpin`, () => {
  before(async () => {
    await start()
  })
  it(`pin '${recursive}'...`, async () => {
    options.wrapWithDirectory = false
    const { cid } = await api.add(content, options)
    const pinned = await api.pin.add(cid, {
      recursive: true,
    })
    expect(pinned.toString()).to.equal(cid.toString())
    const { cid: fetched, type } = await ipfsBundle.hasPin(api, cid, recursive)
    expect(fetched.toString()).to.equal(contentCidV1)
    expect(type).to.equal(recursive)
  })
  it(`unpin '${direct}'...`, async () => {
    // Doesn't unpin
    var catched = null
    try {
      await ipfsBundle.pinRm(api, contentCid, { recursive: false })
    } catch (error) {
      catched = error
    }
    chai.expect(catched).to.be.an('Error')
    expect(catched.message).to.equal('QmNRCQWfgze6AbBCaT1rkrkV5tJ2aP4oTNPb5JZcXYywve is pinned recursively')
    // Content keeps its recursive pin
    const { cid: fetched, type } = await ipfsBundle.hasPin(api, contentCid, recursive)
    expect(fetched.toString()).to.equal(contentCidV1)
    expect(type).to.equal(recursive)
  })
  after(async () => {
    await stop()
  })
})

describe(`Wrapped '${direct}'`, () => {
  before(async () => {
    await start()
  })
  it(`pin '${direct}'...`, async () => {
    const hash = await ipfsBundle.addAll(api, file1, options)
    var hashFile = null
    var hashParent = null
    for (const key of hash.keys()) {
      if (hashFile === null) {
        hashFile = key
      } else if (hashParent === null) {
        hashParent = key
      }
    }
    var pinned = await api.pin.add(hashParent, {
      recursive: false,
    })
    expect(pinned.toString()).to.equal(hashParent.toString())
    var { cid: fetched, type } = await ipfsBundle.hasPin(api, hashParent, direct)
    expect(fetched.toString()).to.equal(hashParent.toString())
    expect(fetched.toString()).to.equal(parentFile1CidV1)
    expect(type).to.equal(direct)
    // hashFile is not pinned
    var { cid: fetched, type } = await ipfsBundle.hasPin(api, hashFile)
    expect(fetched.toString()).to.equal('')
    // Pin
    var pinned = await api.pin.add(hashFile, {
      recursive: false,
    })
    expect(pinned.toString()).to.equal(hashFile.toString())
    var { cid: fetched, type } = await ipfsBundle.hasPin(api, hashFile)
    expect(fetched.toString()).to.equal(hashFile.toString())
    expect(type).to.equal(direct)
    // Link
    var { cid: fetched, parentCid, type } = await ipfsBundle.hasPin(api, parentFile1Cid, indirect, '/file1.txt')
    expect(fetched.toString()).to.equal(contentCidV1)
    expect(parentCid).to.equal(null)
    expect(type).to.equal(direct)
  })
  it(`unpin '${direct}'...`, async () => {
    const unpinned = await ipfsBundle.pinRm(api, parentFile1Cid, { recursive: false })
    expect(unpinned.toString()).to.equal(parentFile1CidV1)
    var { cid: fetched } = await ipfsBundle.hasPin(api, parentFile1Cid, recursive)
    expect(fetched.toString()).to.equal('')
    var { cid: fetched, type } = await ipfsBundle.hasPin(api, contentCid)
    expect(fetched.toString()).to.equal(contentCidV1)
    expect(type).to.equal(direct)
  })
  after(async () => {
    await stop()
  })
})

describe(`Wrapped '${recursive}'`, () => {
  before(async () => {
    await start()
  })
  it(`pin '${recursive}'...`, async () => {
    const hash = await ipfsBundle.addAll(api, file1, options)
    var hashFile = null
    var hashParent = null
    for (const key of hash.keys()) {
      if (hashFile === null) {
        hashFile = key
      } else if (hashParent === null) {
        hashParent = key
      }
    }
    const pinned = await api.pin.add(hashParent, {
      recursive: true,
    })
    expect(pinned.toString()).to.equal(hashParent.toString())
    var { cid: fetched, type } = await ipfsBundle.hasPin(api, hashParent, recursive)
    expect(fetched.toString()).to.equal(hashParent.toString())
    expect(fetched.toString()).to.equal(parentFile1CidV1)
    expect(type).to.equal(recursive)
    var { cid: fetched, type } = await ipfsBundle.hasPin(api, contentCid)
    expect(fetched.toString()).to.equal(hashFile.toString())
    expect(type).to.equal(indirect)
  })
  it(`unpin '${recursive}'...`, async () => {
    const unpinned = await ipfsBundle.pinRm(api, parentFile1Cid, { recursive: true })
    expect(unpinned.toString()).to.equal(parentFile1CidV1)
    var { cid: fetched } = await ipfsBundle.hasPin(api, parentFile1Cid, recursive)
    expect(fetched.toString()).to.equal('')
    var { cid: fetched } = await ipfsBundle.hasPin(api, contentCid)
    expect(fetched.toString()).to.equal('')
  })
  after(async () => {
    await stop()
  })
})

describe(`Wrapped '${direct}' pin and '${recursive}' unpin`, () => {
  before(async () => {
    await start()
  })
  it(`pin '${direct}'...`, async () => {
    await ipfsBundle.addAll(api, file1, options)
    var pinned = await api.pin.add(parentFile1Cid, {
      recursive: false,
    })
    expect(pinned.toString()).to.equal(parentFile1Cid)
    var { cid: fetched, type } = await ipfsBundle.hasPin(api, parentFile1Cid, direct)
    expect(fetched.toString()).to.equal(parentFile1CidV1)
    expect(type).to.equal(direct)
    // Pin
    var pinned = await api.pin.add(contentCid, {
      recursive: false,
    })
    expect(pinned.toString()).to.equal(contentCid)
    var { cid: fetched, type } = await ipfsBundle.hasPin(api, contentCid)
    expect(fetched.toString()).to.equal(contentCidV1)
    expect(type).to.equal(direct)
  })
  it(`unpin '${recursive}'...`, async () => {
    var unpinned = await ipfsBundle.pinRm(api, parentFile1Cid, { recursive: true })
    expect(unpinned.toString()).to.equal(parentFile1CidV1)
    var { cid: fetched } = await ipfsBundle.hasPin(api, parentFile1Cid, recursive)
    expect(fetched.toString()).to.equal('')
    // Linked data is still pinned
    var { cid: fetched } = await ipfsBundle.hasPin(api, contentCid)
    expect(fetched.toString()).to.equal(contentCidV1)
    // Unpin recursive
    var unpinned = await ipfsBundle.pinRm(api, contentCid, { recursive: true })
    expect(unpinned.toString()).to.equal(contentCidV1)
    var { cid: fetched } = await ipfsBundle.hasPin(api, contentCid)
    expect(fetched.toString()).to.equal('')
  })
  after(async () => {
    await stop()
  })
})

describe(`Wrapped and dependency`, () => {
  before(async () => {
    await start()
  })
  it(`pin '${recursive}'...`, async () => {
    await ipfsBundle.addAll(api, file1, options)
    await api.pin.add(parentFile1Cid, {
      recursive: true,
    })
    await ipfsBundle.addAll(api, file2, options)
    const cid = await api.object.patch.addLink(parentFile2Cid, {
      name: 'link-to-file1',
      cid: new CID(contentCid),
    })
    await api.pin.add(cid, {
      recursive: true,
    })
    expect(cid.toString()).to.equal(parentFile2CidWithLinkToFile1)
  })
  it(`unpin '${recursive}'...`, async () => {
    var unpinned = await ipfsBundle.pinRm(api, parentFile1Cid, true)
    expect(unpinned.toString()).to.equal(parentFile1CidV1)
    var { cid: fetched, parentCid, type } = await ipfsBundle.hasPin(api, contentCid)
    expect(fetched.toString()).to.equal(contentCidV1)
    expect(parentCid.toString()).to.equal(parentFile2CidWithLinkToFile1V1)
    expect(type).to.equal(indirect)
  })
  after(async () => {
    await stop()
  })
})
