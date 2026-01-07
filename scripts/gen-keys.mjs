import * as jose from "jose" 

const { privateKey } = await jose.generateKeyPair("RS256", {
  extractable: true,
});

const privatePem = await jose.exportPKCS8(privateKey);
console.log(Buffer.from(privatePem).toString("base64"));
