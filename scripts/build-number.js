"use strict";

const fs = require("fs");
const { generate, validate } = require("build-number-generator");
const sourceMetadata = "./metadata/plugin.info";
const targetMetadata = "./build/plugins/ipfs/plugin.info";
const sourcePackage = "./package.json";

// plugin.info
var rawdata = fs.readFileSync(sourceMetadata);
var infoPlugin = JSON.parse(rawdata);
if (infoPlugin.version == undefined) {
  console.error("Undefined 'plugin.info' version...");
  return false;
}
var version = infoPlugin.version;
console.log("Current: " + sourceMetadata + " version: " + version);

// package.json
var rawdata = fs.readFileSync(sourcePackage);
var infoProject = JSON.parse(rawdata);
if (infoProject.version == undefined) {
  console.error("Undefined 'package.json' version...");
  return false;
}
console.log("Current: " + sourcePackage + " version: " + infoProject.version);

// Generate new version if applicable
if (validate(version) == false) {
  version = generate(version)
}
console.log("Generated version: " + version);

// update version
infoProject.version = version;
infoPlugin.version = version;

// update package.json
var data = JSON.stringify(infoProject, null, 2);
fs.writeFile(sourcePackage, data, (err) => {
  if (err) throw err;
});

// update plugin.info
var data = JSON.stringify(infoPlugin, null, 2);
fs.writeFile(targetMetadata, data, (err) => {
  if (err) throw err;
});