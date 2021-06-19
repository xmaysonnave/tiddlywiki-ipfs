/*eslint no-unused-expressions:"off"*/
/*eslint no-undef:"off"*/
;('use strict')

const fs = require('fs')
const sigUtil = require('eth-sig-util')
const chai = require('chai')

const { expect } = chai

const publicKey = process.env.ETHEREUM_PUBLIC_KEY
const derivedPublicKey = process.env.ETHEREUM_DERIVED_PUBLIC_KEY
const privateKeyHex = process.env.ETHEREUM_PRIVATE_KEY
const message = 'Hello, world!'

describe('Encrypt', () => {
  it('encrypt', () => {
    const outputText = sigUtil.encrypt(derivedPublicKey, { data: message }, 'x25519-xsalsa20-poly1305')
    const result = sigUtil.decrypt(outputText, privateKeyHex)
    expect(message === result).to.be.true
  })
  it('encrypt Safely', () => {
    const outputText = sigUtil.encryptSafely(derivedPublicKey, { data: message }, 'x25519-xsalsa20-poly1305')
    const result = sigUtil.decryptSafely(outputText, privateKeyHex)
    expect(message === result).to.be.true
  })
})

describe('EncryptionPublicKey', () => {
  it('getEncryptionPublicKey', () => {
    const encryptionPublicKey = sigUtil.getEncryptionPublicKey(privateKeyHex)
    expect(encryptionPublicKey === derivedPublicKey).to.be.true
  })
})

describe('PersonalSign', () => {
  it('String personalSign', () => {
    const msgParams = { data: message }
    const privateKey = Buffer.from(privateKeyHex, 'hex')
    const signed = sigUtil.personalSign(privateKey, msgParams)
    msgParams.sig = signed
    const recovered = sigUtil.recoverPersonalSignature(msgParams)
    const result = sigUtil.normalize(recovered)
    expect(result === publicKey.toLowerCase()).to.be.true
  })
  it('Encrypted personalSign', () => {
    const outputText = sigUtil.encrypt(derivedPublicKey, { data: message }, 'x25519-xsalsa20-poly1305')
    const msgParams = { data: JSON.stringify(outputText) }
    const privateKey = Buffer.from(privateKeyHex, 'hex')
    const signed = sigUtil.personalSign(privateKey, msgParams)
    msgParams.sig = signed
    const recovered = sigUtil.recoverPersonalSignature(msgParams)
    const result = sigUtil.normalize(recovered)
    expect(result === publicKey.toLowerCase()).to.be.true
  })
})

describe('Decrypt', () => {
  it('decrypt', () => {
    const compressed = fs.readFileSync('./tests/data/compressed.txt', 'utf8')
    var outputText = sigUtil.encrypt(derivedPublicKey, { data: compressed.toString() }, 'x25519-xsalsa20-poly1305')
    outputText = sigUtil.decrypt(outputText, privateKeyHex)
    expect(outputText === compressed).to.be.true
  })
  it('decrypt large', () => {
    const encrypted = fs.readFileSync('./tests/data/encrypted.json', 'utf8')
    const outputText = sigUtil.decrypt(JSON.parse(encrypted), privateKeyHex)
    const unencrypted = fs.readFileSync('./tests/data/unencrypted.json', 'utf8')
    expect(outputText === unencrypted).to.be.true
  })
})
