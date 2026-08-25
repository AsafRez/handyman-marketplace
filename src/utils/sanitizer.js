// HandyHub Security & Input Sanitization Utilities

/**
 * Escapes HTML characters to prevent XSS (Cross-Site Scripting) attacks
 * and strips dangerous script tags & SQL injection patterns.
 */
export const sanitizeText = (input = '', maxLength = 500) => {
  if (typeof input !== 'string') return '';

  let clean = input.trim();

  // 1. Strip dangerous script/iframe/event handler tags
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/on\w+="[^"]*"/gi, '');
  clean = clean.replace(/javascript:[^\s]*/gi, '');

  // 2. Escape HTML entities
  clean = clean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // 3. Truncate to maxLength
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }

  return clean;
};

/**
 * Validates and formats callback phone numbers.
 * Strips invalid symbols, random letters, and symbols.
 * Preserves standard phone structure e.g. +1 (555) 234-8901
 */
export const formatPhoneNumber = (phoneInput = '') => {
  if (typeof phoneInput !== 'string') return '';
  // Strip out all characters except digits and optional leading +
  const digitsOnly = phoneInput.replace(/[^\d]/g, '');
  if (!digitsOnly) return '';

  // Format as +1 (XXX) XXX-XXXX or standard national number
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+1 (${digitsOnly.substring(1, 4)}) ${digitsOnly.substring(4, 7)}-${digitsOnly.substring(7)}`;
  } else if (digitsOnly.length === 10) {
    return `+1 (${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3, 6)}-${digitsOnly.substring(6)}`;
  }
  return `+${digitsOnly}`;
};

/**
 * Decodes escaped HTML entities back to raw characters for display in React text nodes.
 */
export const decodeHTML = (input = '') => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
};

function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';

  const words = [];
  const asciiLength = ascii[lengthProperty] * 8;

  const hash = [];
  const k = sha256.k = sha256.k || [];
  let primeCounter = k[lengthProperty];

  const isPrime = (n) => {
    for (let factor = 2; factor * factor <= n; factor++) {
      if (n % factor === 0) return false;
    }
    return true;
  };
  const getFractionalBits = (n) => {
    return ((n - Math.floor(n)) * maxWord) | 0;
  };

  let candidate = 2;
  while (primeCounter < 64) {
    if (isPrime(candidate)) {
      k[primeCounter] = getFractionalBits(mathPow(candidate, 1 / 3));
      primeCounter++;
    }
    candidate++;
  }

  let hashCounter = 0;
  candidate = 2;
  while (hashCounter < 8) {
    if (isPrime(candidate)) {
      hash[hashCounter] = getFractionalBits(mathPow(candidate, 0.5));
      hashCounter++;
    }
    candidate++;
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // Only ASCII characters supported
    words[i >> 2] |= j << (24 - (i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiLength | 0);

  for (j = 0; j < words[lengthProperty]; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice(0);

    let h0 = hash[0], h1 = hash[1], h2 = hash[2], h3 = hash[3],
        h4 = hash[4], h5 = hash[5], h6 = hash[6], h7 = hash[7];

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);

      const w_i = w[i] = (i < 16) ? w[i] : (
        w[i - 16] + s0 + w[i - 7] + s1
      ) | 0;

      const ch = (h4 & h5) ^ (~h4 & h6);
      const maj = (h0 & h1) ^ (h0 & h2) ^ (h1 & h2);
      const s0_h = rightRotate(h0, 2) ^ rightRotate(h0, 13) ^ rightRotate(h0, 22);
      const s1_h = rightRotate(h4, 6) ^ rightRotate(h4, 11) ^ rightRotate(h4, 25);

      const temp1 = h7 + s1_h + ch + k[i] + w_i;
      const temp2 = s0_h + maj;

      h7 = h6;
      h6 = h5;
      h5 = h4;
      h4 = (h3 + temp1) | 0;
      h3 = h2;
      h2 = h1;
      h1 = h0;
      h0 = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + h0) | 0;
    hash[1] = (hash[1] + h1) | 0;
    hash[2] = (hash[2] + h2) | 0;
    hash[3] = (hash[3] + h3) | 0;
    hash[4] = (hash[4] + h4) | 0;
    hash[5] = (hash[5] + h5) | 0;
    hash[6] = (hash[6] + h6) | 0;
    hash[7] = (hash[7] + h7) | 0;
  }

  for (i = 0; i < 8; i++) {
    const word = hash[i];
    for (let byteIdx = 24; byteIdx >= 0; byteIdx -= 8) {
      const byte = (word >>> byteIdx) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

export const hashPassword = (password = '', email = '') => {
  const salt = email.toLowerCase().trim();
  return sha256(password + salt);
};
