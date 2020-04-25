/* global jest, beforeAll, describe, it, expect */
"use strict";

const log = require("loglevel");
const { URL } = require("universal-url");
const IpfsBundle = require("../build/plugins/ipfs/ipfs-bundle.js").IpfsBundle;

/**
 * https://github.com/purposeindustries/window-or-global
 * The MIT License (MIT) Copyright (c) Purpose Industries
 * version: 1.0.1
 */
const root =
  (typeof self === "object" && self.self === self && self) ||
  (typeof global === "object" && global.global === global && global) ||
  this;

const local = new URL("file:///work/tiddly/tiddlywiki-ipfs/wiki/index.html");
const remote = new URL("https://ipfs.infura.io/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
const api = new URL("https://ipfs.infura.io:5001/");
const gateway = new URL("https://ipfs.infura.io/");
const eth = new URL("https://bluelightav.eth/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau");
const ethLink = new URL(
  "https://bluelightav.eth.link/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau"
);

const relative = "/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau";

beforeAll(() => {
  root.log = log;
  root.ipfsBundle = new IpfsBundle();
  log.setLevel("silent", false);
});

describe("API URL", () => {
  it("Valid Default", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    const parsed = ipfsUri.getDefaultIpfsApiUrl();
    expect(parsed.href === api.href).toBeTruthy();
  });

  it("Valid Safe", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    const parsed = ipfsUri.getIpfsApiUrl();
    expect(parsed.href === api.href).toBeTruthy();
  });

  it("Invalid", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    try {
      ipfsUri.getIpfsApiUrl();
    } catch (error) {
      expect(error.message).toBe("Invalid IPFS API URL...");
    }
  });
});

describe("Document URL", () => {
  it("Valid", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(remote);
    const parsed = ipfsUri.getDocumentUrl();
    expect(parsed.href === remote.href).toBeTruthy();
  });

  it("Invalid", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    try {
      ipfsUri.getDocumentUrl();
    } catch (error) {
      expect(error.message).toBe("Invalid current HTML Document URL...");
    }
  });
});

describe("Gateway URL", () => {
  it("Valid Default", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    const parsed = ipfsUri.getDefaultIpfsGatewayUrl();
    expect(parsed.href === gateway.href).toBeTruthy();
  });

  it("Valid Safe", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    const parsed = ipfsUri.getIpfsGatewayUrl();
    expect(parsed.href === gateway.href).toBeTruthy();
  });

  it("Invalid", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    try {
      ipfsUri.getIpfsGatewayUrl();
    } catch (error) {
      expect(error.message).toBe("Invalid IPFS Gateway URL...");
    }
  });
});

describe("URL", () => {
  it("Valid", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    const parsed = ipfsUri.getUrl(api);
    expect(parsed.href === api.href).toBeTruthy();
  });

  it("Invalid", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    try {
      ipfsUri.getUrl();
    } catch (error) {
      expect(error.message).toBe("Invalid URL...");
    }
  });
});

describe("Base URL", () => {
  it("Origin", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(remote);
    const base = ipfsUri.getIpfsBaseUrl();
    expect(base.href === "https://ipfs.infura.io/").toBeTruthy();
  });

  it("Fallback to default Gateway", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(local);
    const base = ipfsUri.getIpfsBaseUrl();
    expect(base.href === gateway.href).toBeTruthy();
  });
});

describe("Normalize Gateway URL", () => {
  it("Relative. Fallback to Origin...", async () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(remote);
    const parsed = await ipfsUri.normalizeUrl(relative);
    expect(parsed.href === remote.protocol + "//" + remote.hostname + relative).toBeTruthy();
  });

  it("Relative. Fallback to default Gateway...", async () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(local);
    const parsed = await ipfsUri.normalizeUrl(relative);
    expect(parsed.href === gateway.protocol + "//" + gateway.hostname + relative).toBeTruthy();
  });

  it("Remove dot link...", async () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    ipfsUri.getDocumentUrl = jest.fn();
    ipfsUri.getDocumentUrl.mockReturnValueOnce(remote);
    const parsed = await ipfsUri.normalizeUrl(ethLink);
    expect(parsed.href === eth.href).toBeTruthy();
  });
});
