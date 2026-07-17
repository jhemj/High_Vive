import { ApiError, sha256 } from "./server";

export function base64urlEncode(value: Uint8Array) {
  return btoa(String.fromCharCode(...value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64urlDecode(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new ApiError(400, "PASSKEY_ENCODING_INVALID", "Passkey data is not valid base64url.");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new ApiError(400, "PASSKEY_ENCODING_INVALID", "Passkey data is not valid base64url.");
  }
}

export function randomBase64url(bytes = 32) {
  return base64urlEncode(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function parseClientData(encoded: string) {
  try {
    return JSON.parse(new TextDecoder().decode(base64urlDecode(encoded))) as { type?: string; challenge?: string; origin?: string };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "PASSKEY_CLIENT_DATA_INVALID", "Passkey client data is invalid.");
  }
}

export async function verifyPasskeyAssertion(input: {
  publicKeySpki: string;
  algorithm: number;
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
  rpId: string;
  previousCounter: number;
}) {
  const authenticatorData = base64urlDecode(input.authenticatorData);
  if (authenticatorData.byteLength < 37) throw new ApiError(400, "PASSKEY_AUTH_DATA_INVALID", "Passkey authenticator data is invalid.");

  const expectedRpHash = await sha256(input.rpId);
  const actualRpHash = Array.from(authenticatorData.slice(0, 32), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (actualRpHash !== expectedRpHash) throw new ApiError(400, "PASSKEY_RP_INVALID", "Passkey relying-party verification failed.");

  const flags = authenticatorData[32];
  if ((flags & 0x01) === 0 || (flags & 0x04) === 0) throw new ApiError(400, "PASSKEY_USER_VERIFICATION_REQUIRED", "Passkey user verification is required.");
  const counter = new DataView(authenticatorData.buffer, authenticatorData.byteOffset, authenticatorData.byteLength).getUint32(33, false);
  if (input.previousCounter > 0 && counter > 0 && counter <= input.previousCounter) {
    throw new ApiError(409, "PASSKEY_COUNTER_REPLAY", "This passkey assertion appears to have been replayed.");
  }

  const clientData = base64urlDecode(input.clientDataJSON);
  const clientHash = new Uint8Array(await crypto.subtle.digest("SHA-256", clientData));
  const signed = new Uint8Array(authenticatorData.length + clientHash.length);
  signed.set(authenticatorData);
  signed.set(clientHash, authenticatorData.length);
  const spki = base64urlDecode(input.publicKeySpki);
  const signature = base64urlDecode(input.signature);

  let verified = false;
  if (input.algorithm === -7) {
    const key = await crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const raw = derEcdsaToRaw(signature, 32);
    verified = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, raw as unknown as BufferSource, signed as unknown as BufferSource);
    if (!verified) verified = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signature as unknown as BufferSource, signed as unknown as BufferSource).catch(() => false);
  } else if (input.algorithm === -257) {
    const key = await crypto.subtle.importKey("spki", spki, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    verified = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature as unknown as BufferSource, signed as unknown as BufferSource);
  } else {
    throw new ApiError(400, "PASSKEY_ALGORITHM_UNSUPPORTED", "This passkey algorithm is not supported.");
  }

  if (!verified) throw new ApiError(401, "PASSKEY_SIGNATURE_INVALID", "Passkey signature verification failed.");
  return counter;
}

function derEcdsaToRaw(signature: Uint8Array, size: number) {
  if (signature.length === size * 2) return signature;
  let offset = 0;
  if (signature[offset++] !== 0x30) throw new ApiError(400, "PASSKEY_SIGNATURE_INVALID", "Passkey signature is invalid.");
  const sequenceLength = readDerLength(signature, offset);
  offset = sequenceLength.offset;
  if (signature[offset++] !== 0x02) throw new ApiError(400, "PASSKEY_SIGNATURE_INVALID", "Passkey signature is invalid.");
  const rLength = readDerLength(signature, offset);
  offset = rLength.offset;
  const r = signature.slice(offset, offset + rLength.length);
  offset += rLength.length;
  if (signature[offset++] !== 0x02) throw new ApiError(400, "PASSKEY_SIGNATURE_INVALID", "Passkey signature is invalid.");
  const sLength = readDerLength(signature, offset);
  offset = sLength.offset;
  const s = signature.slice(offset, offset + sLength.length);
  const raw = new Uint8Array(size * 2);
  raw.set(trimInteger(r, size), size - Math.min(size, trimInteger(r, size).length));
  raw.set(trimInteger(s, size), size * 2 - Math.min(size, trimInteger(s, size).length));
  return raw;
}

function readDerLength(value: Uint8Array, offset: number) {
  let length = value[offset++];
  if ((length & 0x80) === 0) return { length, offset };
  const bytes = length & 0x7f;
  if (bytes < 1 || bytes > 2) throw new ApiError(400, "PASSKEY_SIGNATURE_INVALID", "Passkey signature is invalid.");
  length = 0;
  for (let index = 0; index < bytes; index += 1) length = (length << 8) | value[offset++];
  return { length, offset };
}

function trimInteger(value: Uint8Array, size: number) {
  let start = 0;
  while (start < value.length - 1 && value[start] === 0) start += 1;
  return value.slice(Math.max(start, value.length - size));
}
