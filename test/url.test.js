/* global jest, beforeAll, describe, it, expect */
"use strict";

const log = require("loglevel");
const root = require("window-or-global");
const { URL } = require("whatwg-url");

const IpfsUri = require("../build/plugins/ipfs/ipfs-uri.js").IpfsUri;

const local = new URL("file:///work/tiddly/tiddlywiki-ipfs/wiki/index.html");
const remote = new URL("https://ipfs.infura.io/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
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
    expect(parsed.toString() === api.toString()).toBeTruthy();
  });

  it("Valid Safe", () => {
    const ipfsUri = new IpfsUri();
    const parsed = ipfsUri.getIpfsApiUrl();
    expect(parsed.toString() === api.toString()).toBeTruthy();
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
    ipfsUri.getDocumentUrl.mockReturnValueOnce(remote);
    const parsed = ipfsUri.getDocumentUrl();
    expect(parsed.toString() === remote.toString()).toBeTruthy();
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
    expect(parsed.toString() === gateway.toString()).toBeTruthy();
  });

  it("Valid Safe", () => {
    const ipfsUri = new IpfsUri();
    const parsed = ipfsUri.getIpfsGatewayUrl();
    expect(parsed.toString()=== gateway.toString()).toBeTruthy();
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
    expect(parsed.toString() === api.toString()).toBeTruthy();
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

describe("Base URL", () => {

  it("Host", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(remote);
    const base = ipfsUri.getIpfsBaseUrl();
    expect(base.toString() === "https://ipfs.infura.io/").toBeTruthy();
  });

  it("Fallback to default Gateway", () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(local);
    const base = ipfsUri.getIpfsBaseUrl();
    expect(base.toString() === gateway.toString()).toBeTruthy();
  });

});

describe("Normalize Gateway URL", () => {

  it("Relative. Fallback to Host...", async () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(remote);
    const parsed  = await ipfsUri.normalizeUrl(relative);
    expect(parsed.toString() === remote.protocol + "//" + remote.hostname + relative).toBeTruthy();
  });

  it("Relative. Fallback to default Gateway...", async () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(local);
    const parsed  = await ipfsUri.normalizeUrl(relative);
    expect(parsed.toString() === gateway.protocol + "//" + gateway.hostname + relative).toBeTruthy();
  });

  it("Remove dot link...", async () => {
    const ipfsUri = new IpfsUri();
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(remote);
    const parsed = await ipfsUri.normalizeUrl(ethLink);
    expect(parsed.toString() === eth.toString()).toBeTruthy();
  });

});
