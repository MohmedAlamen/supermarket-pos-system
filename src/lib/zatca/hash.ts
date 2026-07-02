// SHA-256 hashing utilities for ZATCA hash chain (PIH / current hash)

export async function sha256Base64(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  // ZATCA convention: base64(hex-lowercase(sha256(xml)))
  const hex = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return btoa(hex);
}

// Genesis PIH per ZATCA spec: base64 of the hex SHA-256 of an empty string
// = base64("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
export const GENESIS_PIH =
  "ZTNiMGM0NDI5OGZjMWMxNDlhZmJmNGM4OTk2ZmI5MjQyN2FlNDFlNDY0OWI5MzRjYTQ5NTk5MWI3ODUyYjg1NQ==";
