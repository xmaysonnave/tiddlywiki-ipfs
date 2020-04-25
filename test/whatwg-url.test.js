/* global jest, beforeAll, describe, it, expect */
"use strict";

/**
 * url.href;
 * url.origin
 * url.protocol;
 * url.username;
 * url.password;
 * url.host;
 * url.hostname;
 * url.port;
 * url.pathname;
 * url.search;
 * url.hash;
 * https://jsdom.github.io/whatwg-url/
 * https://github.com/stevenvachon/universal-url
 * https://github.com/stevenvachon/universal-url-lite
 * https://url.spec.whatwg.org/
 */

const log = require("loglevel");
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

const invalid = "Wrong URL...";
const baseFile = "file:///work/tiddly/tiddlywiki-ipfs/wiki/index.html";
const baseHttp = "https://ipfs.bluelightav.org";
const absolute = "https://bluelightav.eth";
const relative = "/ipfs/bafybeibu35gxr445jnsqc23s2nrumlnbkeije744qlwkysobp7w5ujdzau";

beforeAll(() => {
  root.log = log;
  root.ipfsBundle = new IpfsBundle();
  log.setLevel("silent", false);
});

describe("WHATWG-URL", () => {
  it("Undefined URL", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    expect(() => {
      ipfsUri.getUrl();
    }).toThrow();
  });

  it("Invalid URL", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    expect(() => {
      ipfsUri.getUrl(invalid);
    }).toThrow();
  });

  it("File protocol URL", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    const parsed = ipfsUri.getUrl(baseHttp);
    expect(
      parsed.protocol === "https:" &&
        parsed.origin === baseHttp &&
        parsed.pathname === "/" &&
        parsed.search === "" &&
        parsed.hash === "" &&
        parsed.href === baseHttp + "/"
    ).toBeTruthy();
  });

  it("File protocol URL", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    const parsed = ipfsUri.getUrl(baseFile);
    expect(
      parsed.protocol === "file:" &&
        parsed.origin === "file://" &&
        parsed.pathname === "/work/tiddly/tiddlywiki-ipfs/wiki/index.html" &&
        parsed.href === baseFile
    ).toBeTruthy();
  });

  it("Useless base HTTP URL", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    const parsed = ipfsUri.getUrl(absolute, baseHttp);
    expect(
      parsed.protocol === "https:" && parsed.hostname === "bluelightav.eth" && parsed.href == absolute + "/"
    ).toBeTruthy();
  });

  it("Relative URL", () => {
    const ipfsUri = root.ipfsBundle.ipfsUri;
    const parsed = ipfsUri.getUrl(relative, baseHttp);
    expect(parsed.href === baseHttp + relative).toBeTruthy();
  });
});
