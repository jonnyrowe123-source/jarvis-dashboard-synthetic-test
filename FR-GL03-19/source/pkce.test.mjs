import test from 'node:test';
import assert from 'node:assert/strict';
import {challengeS256,createAuthorizationMaterial} from './pkce.mjs';
test('RFC 7636 S256 vector',()=>assert.equal(challengeS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'));
test('PKCE fresh independent material and lengths',()=>{const values=Array.from({length:100},createAuthorizationMaterial);const all=values.flatMap(x=>[x.verifier,x.state,x.nonce]);assert.equal(new Set(all).size,300);for(const x of values){for(const k of ['verifier','challenge','state','nonce'])assert.match(x[k],/^[-A-Za-z0-9_]{43}$/);assert.equal(x.challengeMethod,'S256');assert.equal(x.challenge,challengeS256(x.verifier));}});
test('PKCE invalid inputs rejected',()=>{for(const v of [undefined,42,'a'.repeat(42),'a'.repeat(129),'!'.repeat(43)])assert.throws(()=>challengeS256(v));});
