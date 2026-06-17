import crypto from "crypto";

const MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY;

const isMasterkeyValid = (master_key) => {
  if (!master_key) {
    throw new Error("MASTER_ENCRYPTION_KEY is not set");
  }

  const buf = Buffer.from(master_key, "hex");

  if (buf.length !== 32) {
    throw new Error(
      "MASTER_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)",
    );
  }

  return buf;
};

export function encryptToken(token) {
  const validMasterKey = isMasterkeyValid(MASTER_KEY);

  const iv = crypto.randomBytes(12);
  const cypher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(validMasterKey, "hex"),
    iv,
  );
  const encrypted = Buffer.concat([
    cypher.update(token, "utf-8"),
    cypher.final(),
  ]);
  const authTag = cypher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

export function decryptToken(buffer) {
  const validMasterKey = isMasterkeyValid(MASTER_KEY);

  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(validMasterKey, "hex"),
    iv,
  );
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}
