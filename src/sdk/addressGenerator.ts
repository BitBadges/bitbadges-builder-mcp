/**
 * Address generation utilities for BitBadges
 * Ported from bitbadgesjs-sdk/src/core/aliases.ts
 */

import { bech32 } from 'bech32';
import crypto from 'crypto';

const BackedPathGenerationPrefix = 0x12;
const DenomGenerationPrefix = 0x0c;

/**
 * Module-based address derivation following Cosmos SDK patterns
 */
function Module(moduleName: string, ...derivationKeys: Buffer[]): string {
  let mKey = Buffer.from(moduleName);

  if (derivationKeys.length === 0) {
    throw new Error('derivationKeys must not be empty');
  }

  mKey = Buffer.concat([mKey, Buffer.from([0])]);
  let addr = Hash('module', Buffer.concat([mKey, derivationKeys[0]]));

  for (let i = 1; i < derivationKeys.length; i++) {
    addr = Derive(addr, derivationKeys[i]);
  }

  return addr;
}

/**
 * SHA256 hash function
 */
function Hash(typ: string | Buffer, key: Buffer): string {
  const hasher = crypto.createHash('sha256');
  hasher.update(typ);
  const th = hasher.digest();

  const hasher2 = crypto.createHash('sha256');
  hasher2.update(th);
  hasher2.update(key);
  const finalDigest = hasher2.digest().toString('hex');
  return finalDigest;
}

/**
 * Derive address from previous address and key
 */
function Derive(address: string, key: Buffer): string {
  return Hash(Buffer.from(address, 'hex'), key);
}

/**
 * Generate an alias address for a module derivation
 */
export function generateAlias(moduleName: string, derivationKeys: Buffer[]): string {
  const address = Module(moduleName, ...derivationKeys);
  const cosmosPrefix = 'bb';
  const words = bech32.toWords(Buffer.from(address, 'hex'));
  const bech32Address = bech32.encode(cosmosPrefix, words);
  return bech32Address;
}

/**
 * Get derivation keys for an IBC backed denom
 */
export function getAliasDerivationKeysForIBCBackedDenom(ibcDenom: string): Buffer[] {
  const derivationKey = [Buffer.from([BackedPathGenerationPrefix]), Buffer.from(ibcDenom, 'utf8')];
  return derivationKey;
}

/**
 * Generate IBC backed denom alias address
 * This is the deterministic backing address for an IBC denom
 */
export function generateAliasAddressForIBCBackedDenom(ibcDenom: string): string {
  const derivationKey = getAliasDerivationKeysForIBCBackedDenom(ibcDenom);
  return generateAlias('tokenization', derivationKey);
}

/**
 * Get derivation keys for a Cosmos coin wrapper denom
 */
export function getAliasDerivationKeysForDenom(denom: string): Buffer[] {
  const derivationKey = [Buffer.from([DenomGenerationPrefix]), Buffer.from(denom, 'utf8')];
  return derivationKey;
}

/**
 * Generate Cosmos coin wrapper denom alias address
 */
export function generateAliasAddressForDenom(denom: string): string {
  const derivationKey = getAliasDerivationKeysForDenom(denom);
  return generateAlias('tokenization', derivationKey);
}
