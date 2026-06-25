// Lightweight at-rest obfuscation for student-teacher messages.
// NOTE: this is NOT true end-to-end encryption (admin can decrypt for moderation).
// Messages are XOR-masked with a key derived from the thread tuple and base64-encoded,
// so a casual DB scan does not surface plaintext content.

const deriveKey = (threadKey: string): Uint8Array => {
  const enc = new TextEncoder().encode("ngcad-lms::" + threadKey);
  // Simple FNV-1a stretched to 32 bytes
  const out = new Uint8Array(32);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < enc.length; i++) {
    h ^= enc[i];
    h = Math.imul(h, 16777619) >>> 0;
  }
  for (let i = 0; i < 32; i++) {
    h ^= (h << 13) >>> 0;
    h ^= (h >>> 17);
    h = Math.imul(h ^ (h << 5), 2654435761) >>> 0;
    out[i] = h & 0xff;
  }
  return out;
};

export const threadKey = (courseId: string, studentId: string, teacherId: string) =>
  `${courseId}|${studentId}|${teacherId}`;

export const encryptMessage = (plaintext: string, key: string): string => {
  const k = deriveKey(key);
  const data = new TextEncoder().encode(plaintext);
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ k[i % k.length];
  let bin = "";
  for (let i = 0; i < out.length; i++) bin += String.fromCharCode(out[i]);
  return btoa(bin);
};

export const decryptMessage = (ciphertext: string, key: string): string => {
  try {
    const bin = atob(ciphertext);
    const k = deriveKey(key);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) ^ k[i % k.length];
    return new TextDecoder().decode(out);
  } catch {
    return "[unable to decrypt]";
  }
};