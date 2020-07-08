/*eslint no-unused-vars:"off"*/
/*global jest,beforeAll,describe,it,expect*/
'use strict'

const sigUtil = require('eth-sig-util')
const publicKey = '0x526883Cff4F761343181999f47b76B9271Aa73Dc'
const derivedPublicKey = '6yzMxyMBxlKRxZSGaLuN3GEZkOaFjuejFGhYfKIRXWI='
const privateKey =
  '63c350a479ced6783e76c68668d7b639f8dd38bdf3d83f68d1a77a41feab26e7'
const message = 'Hello, world!'
const msgParams = { data: message }
beforeAll(() => {})
describe('Encrypt', () => {
  it('Encrypt', async () => {
    var outputText = sigUtil.encrypt(
      derivedPublicKey,
      msgParams,
      'x25519-xsalsa20-poly1305'
    )
    const result = sigUtil.decrypt(outputText, privateKey)
    expect(text === result).toBeTruthy()
  })
  it('Encrypt Safely', async () => {
    var outputText = sigUtil.encryptSafely(
      derivedPublicKey,
      msgParams,
      'x25519-xsalsa20-poly1305'
    )
    const result = sigUtil.decryptSafely(outputText, privateKey)
    expect(text === result).toBeTruthy()
  })
})
describe('personalSign', () => {
  it('Encrypt', async () => {
    var outputText = sigUtil.encrypt(
      derivedPublicKey,
      msgParams,
      'x25519-xsalsa20-poly1305'
    )
    const result = sigUtil.decrypt(outputText, privateKey)
    expect(text === result).toBeTruthy()
  })
  it('Encrypt Safely', async () => {
    var outputText = sigUtil.encryptSafely(
      derivedPublicKey,
      msgParams,
      'x25519-xsalsa20-poly1305'
    )
    const result = sigUtil.decryptSafely(outputText, privateKey)
    expect(text === result).toBeTruthy()
  })
})
