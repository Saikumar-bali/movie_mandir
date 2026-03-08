import 'react-native-url-polyfill/auto';
import { ENV } from '../config/env';

// Playback constants - loaded from environment only
// These headers mimic the APK's ExoPlayer media request behavior
const APK_VERIFY_SECRET = ENV.APK_VERIFY_SECRET;
const DEFAULT_REFERER = ENV.PLAYBACK_DEFAULT_REFERER;
const DEFAULT_USER_AGENT = ENV.PLAYBACK_DEFAULT_USER_AGENT;
const DEFAULT_X_REQUEST_X = ENV.PLAYBACK_X_REQUEST_X;
const DEFAULT_ACCEPT_ENCODING = ENV.PLAYBACK_ACCEPT_ENCODING;

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const SHA256_INIT = new Uint32Array([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

function rotateRight(value, amount) {
  return (value >>> amount) | (value << (32 - amount));
}

function concatBytes(left, right) {
  const output = new Uint8Array(left.length + right.length);
  output.set(left, 0);
  output.set(right, left.length);
  return output;
}

function utf8Bytes(value) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(String(value || ''));
  }

  const encoded = unescape(encodeURIComponent(String(value || '')));
  const output = new Uint8Array(encoded.length);

  for (let index = 0; index < encoded.length; index += 1) {
    output[index] = encoded.charCodeAt(index);
  }

  return output;
}

function sha256(bytes) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const bitLength = source.length * 8;
  const paddedLength = (((source.length + 9) + 63) >> 6) << 6;
  const padded = new Uint8Array(paddedLength);
  const words = new Uint32Array(64);
  const hash = new Uint32Array(SHA256_INIT);
  const view = new DataView(padded.buffer);

  padded.set(source, 0);
  padded[source.length] = 0x80;
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(padded.length - 4, bitLength >>> 0, false);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + (index * 4), false);
    }

    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];

    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choose + SHA256_K[index] + words[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  const output = new Uint8Array(32);
  const outputView = new DataView(output.buffer);

  for (let index = 0; index < hash.length; index += 1) {
    outputView.setUint32(index * 4, hash[index], false);
  }

  return output;
}

function hmacSha256(keyBytes, messageBytes) {
  const blockSize = 64;
  let key = keyBytes instanceof Uint8Array ? keyBytes : new Uint8Array(keyBytes);
  const message = messageBytes instanceof Uint8Array ? messageBytes : new Uint8Array(messageBytes);

  if (key.length > blockSize) {
    key = sha256(key);
  }

  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(key, 0);

  const innerPad = new Uint8Array(blockSize);
  const outerPad = new Uint8Array(blockSize);

  for (let index = 0; index < blockSize; index += 1) {
    innerPad[index] = paddedKey[index] ^ 0x36;
    outerPad[index] = paddedKey[index] ^ 0x5c;
  }

  return sha256(concatBytes(outerPad, sha256(concatBytes(innerPad, message))));
}

function bytesToBase64(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;

    output += alphabet[(triple >>> 18) & 0x3f];
    output += alphabet[(triple >>> 12) & 0x3f];
    output += index + 1 < bytes.length ? alphabet[(triple >>> 6) & 0x3f] : '=';
    output += index + 2 < bytes.length ? alphabet[triple & 0x3f] : '=';
  }

  return output;
}

function parseHeaderObject(headerValue) {
  if (!headerValue) {
    return {};
  }

  if (typeof headerValue === 'object' && !Array.isArray(headerValue)) {
    return headerValue;
  }

  if (typeof headerValue !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(headerValue);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function readSourceReferer(source = {}) {
  const headerValue = source?.header;
  if (!headerValue) {
    return '';
  }

  if (typeof headerValue === 'string') {
    const trimmed = headerValue.trim();
    if (!trimmed) {
      return '';
    }

    const parsed = parseHeaderObject(trimmed);
    if (Object.keys(parsed).length) {
      return String(parsed.Referer || parsed.referer || '').trim();
    }

    return trimmed;
  }

  return String(headerValue.Referer || headerValue.referer || '').trim();
}

function shouldSignBareLink(link) {
  if (typeof link !== 'string') {
    return false;
  }

  const trimmed = link.trim();
  if (!trimmed) {
    return false;
  }

  return !/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) && !trimmed.startsWith('//');
}

export function normalizeMovieBlastLink(link) {
  if (typeof link !== 'string') {
    return '';
  }

  const trimmed = link.trim();
  if (!trimmed) {
    return '';
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  return `https://${trimmed.replace(/^\/+/, '')}`;
}

export function getMovieBlastLocalPathKey(link) {
  const normalized = normalizeMovieBlastLink(link);
  if (!normalized) {
    return '';
  }

  try {
    const url = new URL(normalized);
    return decodeURIComponent(url.pathname.split('/').pop() || 'movieblast-media');
  } catch {
    return normalized.split('?')[0].split('/').pop() || 'movieblast-media';
  }
}

export function getUnsupportedPlaybackMode(source = {}) {
  if (Number(source?.embed) === 1) {
    return 'embed';
  }

  if (Number(source?.supported_hosts) === 1) {
    return 'supported_hosts';
  }

  return null;
}

export async function buildMovieBlastPlaybackRequest(source = {}) {
  const rawLink = typeof source === 'string' ? source : source?.link;
  const normalizedUrl = normalizeMovieBlastLink(rawLink);

  if (!normalizedUrl) {
    return { url: '', headers: {} };
  }

  const headerObject = parseHeaderObject(source?.header);
  const referer = readSourceReferer(source) || headerObject.Referer || headerObject.referer || DEFAULT_REFERER;
  const userAgent = String(source?.useragent || headerObject['User-Agent'] || headerObject['user-agent'] || DEFAULT_USER_AGENT);

  const headers = {
    Referer: String(referer),
    'User-Agent': userAgent,
    'x-request-x': DEFAULT_X_REQUEST_X,
    'Accept-Encoding': DEFAULT_ACCEPT_ENCODING || 'gzip, deflate',
    ...headerObject,
  };

  if (!shouldSignBareLink(rawLink)) {
    return { url: normalizedUrl, headers };
  }

  const url = new URL(normalizedUrl);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${url.pathname}${timestamp}`;

  if (!APK_VERIFY_SECRET) {
    throw new Error('[MovieBlastPlayback] APK_VERIFY_SECRET is required but not configured in ENV');
  }

  const signature = bytesToBase64(hmacSha256(utf8Bytes(APK_VERIFY_SECRET), utf8Bytes(payload)));
  const separator = url.search ? '&' : '?';

  return {
    url: `${url.toString()}${separator}verify=${timestamp}-${encodeURIComponent(signature)}`,
    headers,
  };
}
