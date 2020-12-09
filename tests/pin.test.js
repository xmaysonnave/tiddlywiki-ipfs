/*eslint no-unused-expressions:"off"*/
/*eslint no-undef:"off"*/
;('use strict')

const fs = require('fs')
const fse = require('fs-extra')
const CID = require('cids')
const IPFS = require('ipfs')
const Repo = require('ipfs-repo')
const chai = require('chai')

/*
 * https://github.com/ipfs/js-ipfs/tree/master/docs/core-api
 * export IPFS_PATH=.ipfs
 * yarn jsipfs init -e -p test
 **/

const { expect } = chai

function getCid (cid) {
  try {
    const newCid = new CID(cid)
    if (CID.isCID(newCid)) {
      return newCid
    }
  } catch (error) {
    // Ignore
  }
  return null
}

function analyzeType (type) {
  if (type === undefined || type == null || type.trim() === '') {
    return {
      parentCid: null,
      type: null
    }
  }
  var res = type.split(' ')
  if (res.length === 1) {
    return {
      parentCid: null,
      type: res[0]
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
  const parentCid = getCid(res[index + 2])
  if (!parentCid) {
    throw new Error(`Unknown pin type: ${type}`)
  }
  return {
    parentCid: parentCid,
    type: res[0]
  }
}

async function hasPin (key, type, ipfsPath) {
  try {
    if (ipfsPath) {
      ipfsPath = `${key}${ipfsPath}`
    } else {
      ipfsPath = key
    }
    for await (var { cid, type: fetchedType } of api.pin.ls({
      paths: [ipfsPath]
    })) {
      if (cid !== undefined && cid !== null) {
        var { type: fetchedType, parentCid } = analyzeType(fetchedType)
        if (type) {
          if (type === fetchedType) {
            return {
              cid: cid,
              parentCid: parentCid,
              type: type
            }
          }
        }
        return {
          cid: cid,
          parentCid: parentCid,
          type: fetchedType
        }
      }
    }
  } catch (error) {
    // Ignore
  }
  return {
    cid: '',
    parentCid: null,
    type: ''
  }
}

async function addAll (source, options) {
  const data = new Map()
  for await (const result of api.addAll(source, options)) {
    data.set(result.cid.toString(), {
      path: result.path,
      mode: result.mode,
      mtime: result.mtime,
      size: result.size
    })
  }
  return data
}

async function pinRm (cid, recursive) {
  try {
    const unpinned = await api.pin.rm(cid, {
      recursive: recursive
    })
    return unpinned
  } catch (error) {
    return ''
  }
}

async function start () {
  fs.rmSync('.ipfs', { recursive: true, force: true })
  fse.copySync('tests/.ipfs', '.ipfs')
  api = await IPFS.create({
    repo: new Repo('.ipfs')
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

const file1 = [
  {
    path: '/file1.txt',
    content: content
  }
]
const parentFile1Cid = 'QmNpwpR6uMixTtnvXUEQ81K9HdMYzZV2KWS2B7fE3ELFec'

// const file2 = [
//   {
//     path: '/file2.txt',
//     content: content
//   }
// ]
// const parentFile2Cid = 'QmeCUpfcZvxDAQxkzn6kS1Cz2fPKuxz6pGoKc3zeDSP8rn'

const options = {
  chunker: 'rabin-262144-524288-1048576',
  cidVersion: 0,
  hashAlg: 'sha2-256',
  pin: false,
  hashOnly: false,
  rawLeaves: false,
  wrapWithDirectory: true
}

var api = null

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
    const { cid: fetched } = await hasPin(cid)
    expect(fetched).to.equal('')
  })
  it(`Same content keep '${direct}' pin...`, async () => {
    options.wrapWithDirectory = false
    var { cid } = await api.add(content, options)
    var { cid: fetched } = await hasPin(cid)
    expect(fetched).to.equal('')
    const pinned = await api.pin.add(cid, {
      recursive: false
    })
    expect(pinned.toString()).to.equal(cid.toString())
    var { cid: fetched, type } = await hasPin(cid, direct)
    expect(fetched.toString()).to.equal(cid.toString())
    expect(type).to.equal(direct)
    var { cid } = await api.add(content, options)
    var { cid: fetched } = await hasPin(cid)
    expect(fetched.toString()).to.equal(cid.toString())
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
    const hash = await addAll(file1, options)
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
    expect(hashFile).to.equal(contentCid)
    expect(hashFilePath).to.equal('file1.txt')
    expect(hashParent).to.equal(parentFile1Cid)
    const content = await addAll(file1, options)
    for (const [key, value] of content.entries()) {
      if (hashFile !== null) {
        expect(key).to.equal(hashFile)
        expect(key).to.equal(contentCid)
        expect(value.path).to.equal('file1.txt')
        hashFile = null
        hashFilePath = null
      } else if (hashParent === null) {
        expect(key).to.equal(hashParent)
        expect(key).to.equal(parentFile1Cid)
      }
    }
  })
  it('No pin...', async () => {
    const content = await addAll(file1, options)
    for (const key of content.keys()) {
      const { cid: fetched } = await hasPin(key)
      expect(fetched).to.equal('')
    }
  })
  it(`Same content keep '${recursive}' pin...`, async () => {
    var content = await addAll(file1, options)
    for (const key of content.keys()) {
      const { cid } = await hasPin(key)
      expect(cid).to.equal('')
    }
    try {
      const pinned = await api.pin.add(parentFile1Cid, {
        recursive: true
      })
      expect(pinned.toString()).to.equal(parentFile1Cid)
      var { cid: fetched, type } = await hasPin(parentFile1Cid, recursive)
      expect(fetched.toString()).to.equal(parentFile1Cid)
      expect(type).to.equal(recursive)
      var { cid: fetched, parentCid, type } = await hasPin(
        parentFile1Cid,
        indirect,
        '/file1.txt'
      )
      expect(fetched.toString()).to.equal(contentCid)
      expect(parentCid.toString()).to.equal(parentFile1Cid)
      expect(type).to.equal(indirect)
      var { cid: fetched, type } = await hasPin(contentCid, indirect)
      expect(fetched.toString()).to.equal(contentCid)
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
      recursive: false
    })
    expect(pinned.toString()).to.equal(cid.toString())
    const { cid: fetched, type } = await hasPin(cid, direct)
    expect(fetched.toString()).to.equal(cid.toString())
    expect(type).to.equal(direct)
  })
  it(`unpin '${direct}'..`, async () => {
    const unpinned = await pinRm(contentCid, false)
    expect(unpinned.toString()).to.equal(contentCid)
    const { cid: fetched } = await hasPin(contentCid, direct)
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
      recursive: true
    })
    expect(pinned.toString()).to.equal(cid.toString())
    const { cid: fetched, type } = await hasPin(cid, recursive)
    expect(fetched.toString()).to.equal(cid.toString())
    expect(type).to.equal(recursive)
  })
  it(`unpin '${recursive}'...`, async () => {
    const unpinned = await pinRm(contentCid, true)
    expect(unpinned.toString()).to.equal(contentCid)
    const { cid: fetched } = await hasPin(contentCid, recursive)
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
      recursive: false
    })
    expect(pinned.toString()).to.equal(cid.toString())
    const { cid: fetched, type } = await hasPin(cid, direct)
    expect(fetched.toString()).to.equal(cid.toString())
    expect(fetched.toString()).to.equal(contentCid.toString())
    expect(type).to.equal(direct)
  })
  it(`unpin '${recursive}'...`, async () => {
    // recursive unpin direct pin
    const unpinned = await pinRm(contentCid, true)
    expect(unpinned.toString()).to.equal(contentCid)
    const { cid: fetched } = await hasPin(contentCid, direct)
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
      recursive: true
    })
    expect(pinned.toString()).to.equal(cid.toString())
    const { cid: fetched, type } = await hasPin(cid, recursive)
    expect(fetched.toString()).to.equal(cid.toString())
    expect(fetched.toString()).to.equal(contentCid.toString())
    expect(type).to.equal(recursive)
  })
  it(`unpin '${direct}'...`, async () => {
    // Doesn't unpin
    const unpinned = await pinRm(contentCid, false)
    expect(unpinned.toString()).to.equal('')
    // Content keeps its recursive pin
    const { cid: fetched, type } = await hasPin(contentCid, recursive)
    expect(fetched.toString()).to.equal(contentCid.toString())
    expect(type).to.equal(recursive)
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
    const hash = await addAll(file1, options)
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
      recursive: true
    })
    expect(pinned.toString()).to.equal(hashParent)
    var { cid: fetched, type } = await hasPin(hashParent, recursive)
    expect(fetched.toString()).to.equal(hashParent.toString())
    expect(fetched.toString()).to.equal(parentFile1Cid)
    expect(type).to.equal(recursive)
    var { cid: fetched, type } = await hasPin(hashFile)
    expect(fetched.toString()).to.equal(hashFile.toString())
    expect(type).to.equal(indirect)
  })
  it(`unpin '${recursive}'...`, async () => {
    const unpinned = await pinRm(parentFile1Cid, true)
    expect(unpinned.toString()).to.equal(parentFile1Cid)
    var { cid: fetched } = await hasPin(parentFile1Cid, recursive)
    expect(fetched.toString()).to.equal('')
    var { cid: fetched } = await hasPin(contentCid)
    expect(fetched.toString()).to.equal('')
  })
  after(async () => {
    await stop()
  })
})
