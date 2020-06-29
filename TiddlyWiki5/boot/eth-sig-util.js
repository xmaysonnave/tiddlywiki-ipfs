"use strict";var __assign=this&&this.__assign||function(){return(__assign=Object.assign||function(e){for(var t,r=1,n=arguments.length;r<n;r++)for(var i in t=arguments[r])Object.prototype.hasOwnProperty.call(t,i)&&(e[i]=t[i]);return e}).apply(this,arguments)};Object.defineProperty(exports,"__esModule",{value:!0});var ethUtil=require("ethereumjs-util"),ethAbi=require("ethereumjs-abi"),nacl=require("tweetnacl"),naclUtil=require("tweetnacl-util"),TYPED_MESSAGE_SCHEMA={type:"object",properties:{types:{type:"object",additionalProperties:{type:"array",items:{type:"object",properties:{name:{type:"string"},type:{type:"string"}},required:["name","type"]}}},primaryType:{type:"string"},domain:{type:"object"},message:{type:"object"}},required:["types","primaryType","domain","message"]};exports.TYPED_MESSAGE_SCHEMA=TYPED_MESSAGE_SCHEMA;var TypedDataUtils={encodeData:function(e,t,r,n){var i=this;void 0===n&&(n=!0);var a=["bytes32"],o=[this.hashType(e,r)];if(n)for(var s=function(e,t,a){if(void 0!==r[t])return["bytes32",null==a?"0x0000000000000000000000000000000000000000000000000000000000000000":ethUtil.sha3(i.encodeData(t,a,r,n))];if(void 0===a)throw new Error("missing value for field "+e+" of type "+t);if("bytes"===t)return["bytes32",ethUtil.sha3(a)];if("string"===t)return"string"==typeof a&&(a=Buffer.from(a,"utf8")),["bytes32",ethUtil.sha3(a)];if(t.lastIndexOf("]")===t.length-1){var o=t.slice(0,t.lastIndexOf("[")),c=a.map(function(t){return s(e,o,t)});return["bytes32",ethUtil.sha3(ethAbi.rawEncode(c.map(function(e){return e[0]}),c.map(function(e){return e[1]})))]}return[t,a]},c=0,p=r[e];c<p.length;c++){var u=p[c],y=s(u.name,u.type,t[u.name]),l=y[0],d=y[1];a.push(l),o.push(d)}else for(var f=0,h=r[e];f<h.length;f++){if(void 0!==(d=t[(u=h[f]).name]))if("bytes"===u.type)a.push("bytes32"),d=ethUtil.sha3(d),o.push(d);else if("string"===u.type)a.push("bytes32"),"string"==typeof d&&(d=Buffer.from(d,"utf8")),d=ethUtil.sha3(d),o.push(d);else if(void 0!==r[u.type])a.push("bytes32"),d=ethUtil.sha3(this.encodeData(u.type,d,r,n)),o.push(d);else{if(u.type.lastIndexOf("]")===u.type.length-1)throw new Error("Arrays currently unimplemented in encodeData");a.push(u.type),o.push(d)}}return ethAbi.rawEncode(a,o)},encodeType:function(e,t){for(var r="",n=this.findTypeDependencies(e,t).filter(function(t){return t!==e}),i=0,a=n=[e].concat(n.sort());i<a.length;i++){var o=a[i];if(!t[o])throw new Error("No type definition specified: "+o);r+=o+"("+t[o].map(function(e){var t=e.name;return e.type+" "+t}).join(",")+")"}return r},findTypeDependencies:function(e,t,r){if(void 0===r&&(r=[]),e=e.match(/^\w*/u)[0],r.includes(e)||void 0===t[e])return r;r.push(e);for(var n=0,i=t[e];n<i.length;n++)for(var a=i[n],o=0,s=this.findTypeDependencies(a.type,t,r);o<s.length;o++){var c=s[o];!r.includes(c)&&r.push(c)}return r},hashStruct:function(e,t,r,n){return void 0===n&&(n=!0),ethUtil.sha3(this.encodeData(e,t,r,n))},hashType:function(e,t){return ethUtil.sha3(this.encodeType(e,t))},sanitizeData:function(e){var t={};for(var r in TYPED_MESSAGE_SCHEMA.properties)e[r]&&(t[r]=e[r]);return"types"in t&&(t.types=__assign({EIP712Domain:[]},t.types)),t},sign:function(e,t){void 0===t&&(t=!0);var r=this.sanitizeData(e),n=[Buffer.from("1901","hex")];return n.push(this.hashStruct("EIP712Domain",r.domain,r.types,t)),"EIP712Domain"!==r.primaryType&&n.push(this.hashStruct(r.primaryType,r.message,r.types,t)),ethUtil.sha3(Buffer.concat(n))}};function concatSig(e,t,r){var n=ethUtil.fromSigned(t),i=ethUtil.fromSigned(r),a=ethUtil.bufferToInt(e),o=padWithZeroes(ethUtil.toUnsigned(n).toString("hex"),64),s=padWithZeroes(ethUtil.toUnsigned(i).toString("hex"),64),c=ethUtil.stripHexPrefix(ethUtil.intToHex(a));return ethUtil.addHexPrefix(o.concat(s,c)).toString("hex")}function normalize(e){if(e){if("number"==typeof e){var t=ethUtil.toBuffer(e);e=ethUtil.bufferToHex(t)}if("string"!=typeof e){var r="eth-sig-util.normalize() requires hex string or integer input.";throw new Error(r+=" received "+typeof e+": "+e)}return ethUtil.addHexPrefix(e.toLowerCase())}}function personalSign(e,t){var r=ethUtil.toBuffer(t.data),n=ethUtil.hashPersonalMessage(r),i=ethUtil.ecsign(n,e);return ethUtil.bufferToHex(concatSig(i.v,i.r,i.s))}function recoverPersonalSignature(e){var t=getPublicKeyFor(e),r=ethUtil.publicToAddress(t);return ethUtil.bufferToHex(r)}function extractPublicKey(e){return"0x"+getPublicKeyFor(e).toString("hex")}function externalTypedSignatureHash(e){var t=typedSignatureHash(e);return ethUtil.bufferToHex(t)}function signTypedDataLegacy(e,t){var r=typedSignatureHash(t.data),n=ethUtil.ecsign(r,e);return ethUtil.bufferToHex(concatSig(n.v,n.r,n.s))}function recoverTypedSignatureLegacy(e){var t=recoverPublicKey(typedSignatureHash(e.data),e.sig),r=ethUtil.publicToAddress(t);return ethUtil.bufferToHex(r)}function encrypt(e,t,r){switch(r){case"x25519-xsalsa20-poly1305":if("string"!=typeof t.data)throw new Error('Cannot detect secret message, message params should be of the form {data: "secret message"} ');var n=nacl.box.keyPair(),i=void 0;try{i=naclUtil.decodeBase64(e)}catch(e){throw new Error("Bad public key")}var a=naclUtil.decodeUTF8(t.data),o=nacl.randomBytes(nacl.box.nonceLength),s=nacl.box(a,o,i,n.secretKey);return{version:"x25519-xsalsa20-poly1305",nonce:naclUtil.encodeBase64(o),ephemPublicKey:naclUtil.encodeBase64(n.publicKey),ciphertext:naclUtil.encodeBase64(s)};default:throw new Error("Encryption type/version not supported")}}function encryptSafely(e,t,r){var n=Math.pow(2,11),i=t.data;if(!i)throw new Error("Cannot encrypt empty msg.data");if("object"==typeof i&&"toJSON"in i)throw new Error("Cannot encrypt with toJSON property.  Please remove toJSON property");var a={data:i,padding:""},o=Buffer.byteLength(JSON.stringify(a),"utf-8")%n,s=0;return o>0&&(s=n-o-16),a.padding="0".repeat(s),encrypt(e,{data:JSON.stringify(a)},r)}function decrypt(e,t){switch(e.version){case"x25519-xsalsa20-poly1305":var r=nacl_decodeHex(t),n=nacl.box.keyPair.fromSecretKey(r).secretKey,i=naclUtil.decodeBase64(e.nonce),a=naclUtil.decodeBase64(e.ciphertext),o=naclUtil.decodeBase64(e.ephemPublicKey),s=nacl.box.open(a,i,o,n),c=void 0;try{c=naclUtil.encodeUTF8(s)}catch(e){throw new Error("Decryption failed.")}if(c)return c;throw new Error("Decryption failed.");default:throw new Error("Encryption type/version not supported.")}}function decryptSafely(e,t){return JSON.parse(decrypt(e,t)).data}function getEncryptionPublicKey(e){var t=nacl_decodeHex(e),r=nacl.box.keyPair.fromSecretKey(t).publicKey;return naclUtil.encodeBase64(r)}function signTypedMessage(e,t,r){switch(void 0===r&&(r="V4"),r){case"V1":return signTypedDataLegacy(e,t);case"V3":return signTypedData(e,t);case"V4":default:return signTypedData_v4(e,t)}}function recoverTypedMessage(e,t){switch(void 0===t&&(t="V4"),t){case"V1":return recoverTypedSignatureLegacy(e);case"V3":return recoverTypedSignature(e);case"V4":default:return recoverTypedSignature_v4(e)}}function signTypedData(e,t){var r=TypedDataUtils.sign(t.data,!1),n=ethUtil.ecsign(r,e);return ethUtil.bufferToHex(concatSig(n.v,n.r,n.s))}function signTypedData_v4(e,t){var r=TypedDataUtils.sign(t.data),n=ethUtil.ecsign(r,e);return ethUtil.bufferToHex(concatSig(n.v,n.r,n.s))}function recoverTypedSignature(e){var t=recoverPublicKey(TypedDataUtils.sign(e.data,!1),e.sig),r=ethUtil.publicToAddress(t);return ethUtil.bufferToHex(r)}function recoverTypedSignature_v4(e){var t=recoverPublicKey(TypedDataUtils.sign(e.data),e.sig),r=ethUtil.publicToAddress(t);return ethUtil.bufferToHex(r)}function typedSignatureHash(e){var t=new Error("Expect argument to be non-empty array");if(!("object"==typeof e&&"length"in e&&e.length))throw t;var r=e.map(function(e){return"bytes"===e.type?ethUtil.toBuffer(e.value):e.value}),n=e.map(function(e){return e.type}),i=e.map(function(e){if(!e.name)throw t;return e.type+" "+e.name});return ethAbi.soliditySHA3(["bytes32","bytes32"],[ethAbi.soliditySHA3(new Array(e.length).fill("string"),i),ethAbi.soliditySHA3(n,r)])}function recoverPublicKey(e,t){var r=ethUtil.toBuffer(t),n=ethUtil.fromRpcSig(r);return ethUtil.ecrecover(e,n.v,n.r,n.s)}function getPublicKeyFor(e){var t=ethUtil.toBuffer(e.data);return recoverPublicKey(ethUtil.hashPersonalMessage(t),e.sig)}function padWithZeroes(e,t){for(var r=""+e;r.length<t;)r="0"+r;return r}function nacl_decodeHex(e){var t=Buffer.from(e,"hex").toString("base64");return naclUtil.decodeBase64(t)}exports.TypedDataUtils=TypedDataUtils,exports.concatSig=concatSig,exports.normalize=normalize,exports.personalSign=personalSign,exports.recoverPersonalSignature=recoverPersonalSignature,exports.extractPublicKey=extractPublicKey,exports.typedSignatureHash=externalTypedSignatureHash,exports.signTypedDataLegacy=signTypedDataLegacy,exports.recoverTypedSignatureLegacy=recoverTypedSignatureLegacy,exports.encrypt=encrypt,exports.encryptSafely=encryptSafely,exports.decrypt=decrypt,exports.decryptSafely=decryptSafely,exports.getEncryptionPublicKey=getEncryptionPublicKey,exports.signTypedMessage=signTypedMessage,exports.recoverTypedMessage=recoverTypedMessage,exports.signTypedData=signTypedData,exports.signTypedData_v4=signTypedData_v4,exports.recoverTypedSignature=recoverTypedSignature,exports.recoverTypedSignature_v4=recoverTypedSignature_v4;