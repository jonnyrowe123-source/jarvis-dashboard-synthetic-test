import {randomBytes,createHash} from 'node:crypto';
// Isolated building block only; no authentication/session integration.
export function challengeS256(verifier) {
 if(typeof verifier!=='string'||!/^[-A-Za-z0-9._~]{43,128}$/.test(verifier)) throw Error('Invalid PKCE verifier');
 return createHash('sha256').update(verifier,'ascii').digest('base64url');
}
export function createAuthorizationMaterial() {
 const verifier=randomBytes(32).toString('base64url');
 return {verifier,challenge:challengeS256(verifier),challengeMethod:'S256',state:randomBytes(32).toString('base64url'),nonce:randomBytes(32).toString('base64url')};
}
