const crypto = require('crypto');

/**
 * Generate a hash of a given string (default SHA-256)
 * @param string
 * @param options
 * @param options.algorithm The algorithm to use, defaults to SHA-256
 * @returns the hexadecimal string respresentation of the hash
 */
export async function hash(
    string: string,
    { algorithm = 'SHA-256' }: { algorithm?: string }
): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(string);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Creates a cryptographically secure pseudo-random number and returns a hexadecimal string representation of it
 * @returns the hexadecimal string representation
 */
export async function genRandomString(size: number): Promise<string> {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(size, (err: Error, bytes: Buffer) => {
            if (err) {
                reject(err);
            }
            resolve(bytes.toString('hex'));
        });
    });
}
