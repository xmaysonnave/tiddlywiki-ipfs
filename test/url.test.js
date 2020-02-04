/* global jest, beforeAll, describe, it, expect */
"use strict";

const log = require("loglevel");
const root = require("window-or-global");
const { URL } = require("whatwg-url");

const IpfsUri = require("../build/plugins/ipfs/ipfs-uri.js").IpfsUri;

const localDocument = new URL("file:///work/tiddly/tiddlywiki-ipfs/wiki/index.html");
const remoteDocument = new URL("https://ipfs.bluelightav.org/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
const api = new URL("https://ipfs.infura.io:5001/");
const gateway = new URL("https://ipfs.infura.io/");
const eth = new URL("https://bluelightav.eth/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
const ethLink = new URL("https://bluelightav.eth.link/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");

const relative = "/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau";

beforeAll(() => {
  root.log = log;
  log.setLevel("silent", false);
});

describe("API URL", () => {

  it("Valid Default", () => {
    const ipfsUri = new IpfsUri();
    const parsed = ipfsUri.getDefaultIpfsApiUrl();
    expect(parsed.href === api.href).toBeTruthy();
  });

  it("Valid Safe", () => {
    const ipfsUri = new IpfsUri();
    const parsed = ipfsUri.getSafeIpfsApiUrl();
    expect(parsed.href === api.href).toBeTruthy();
  });

  it("Invalid", () => {
    const ipfsUri = new IpfsUri();
    try {
      ipfsUri.getIpfsApiUrl()
    } catch (error) {
      expect(error.message).toBe("Invalid IPFS API URL...");
    }
  });

});

describe("Document URL", () => {

  it("Valid", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(remoteDocument);
    const parsed = ipfsUri.getDocumentUrl();
    expect(parsed.href === remoteDocument.href).toBeTruthy();
  });

  it("Invalid", () => {
    const ipfsUri = new IpfsUri();
    try {
      ipfsUri.getDocumentUrl()
    } catch (error) {
      expect(error.message).toBe("Invalid current HTML Document URL...");
    }
  });

});

describe("Gateway URL", () => {

  it("Valid Default", () => {
    const ipfsUri = new IpfsUri();
    const parsed = ipfsUri.getDefaultIpfsGatewayUrl();
    expect(parsed.href === gateway.href).toBeTruthy();
  });

  it("Valid Safe", () => {
    const ipfsUri = new IpfsUri();
    const parsed = ipfsUri.getSafeIpfsGatewayUrl();
    expect(parsed.href === gateway.href).toBeTruthy();
  });

  it("Invalid", () => {
    const ipfsUri = new IpfsUri();
    try {
      ipfsUri.getIpfsGatewayUrl()
    } catch (error) {
      expect(error.message).toBe("Invalid IPFS Gateway URL...");
    }
  });

});

describe("URL", () => {

  it("Valid", () => {
    const ipfsUri = new IpfsUri();
    const parsed = ipfsUri.getUrl(api);
    expect(parsed.href === api.href).toBeTruthy();
  });

  it("Invalid", () => {
    const ipfsUri = new IpfsUri();
    try {
      ipfsUri.getUrl()
    } catch (error) {
      expect(error.message).toBe("Invalid URL...");
    }
  });

});

describe("Normalize Gateway URL", () => {

  it("Relative. Fallback to Gateway URL...", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(localDocument);
    const parsed  = ipfsUri.normalizeGatewayUrl(relative);
    expect(parsed.href === gateway.protocol + "//" + gateway.hostname + relative).toBeTruthy();
  });

  it("Remove dot link...", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(remoteDocument);
    const parsed = ipfsUri.normalizeGatewayUrl(ethLink);
    expect(parsed.href === eth.href).toBeTruthy();
  });

});
