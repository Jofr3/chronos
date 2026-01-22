/**
 * Password hashing utilities using Web Crypto API
 * Compatible with Cloudflare Workers
 */

const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const HASH_BITS = 256;

/**
 * Hash a password using PBKDF2 with a random salt
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Import the password as a key
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_BITS
  );

  // Combine salt and hash for storage
  const hashArray = new Uint8Array(derivedBits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    // Decode the stored hash
    const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));

    // Extract salt (first 16 bytes) and hash (remaining bytes)
    const salt = combined.slice(0, SALT_LENGTH);
    const storedHashBytes = combined.slice(SALT_LENGTH);

    // Import the password as a key
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      data,
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    // Derive bits using the same salt
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      HASH_BITS
    );

    const derivedHashBytes = new Uint8Array(derivedBits);

    // Compare hashes in constant time
    if (derivedHashBytes.length !== storedHashBytes.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < derivedHashBytes.length; i++) {
      result |= derivedHashBytes[i] ^ storedHashBytes[i];
    }

    return result === 0;
  } catch {
    return false;
  }
}
