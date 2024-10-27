export function escapeString(str: string): string {
    // Remove any instances of "../" to prevent directory traversal
    str = str.replace(/\.\.\//g, '');

    return str
        .replace(/\\/g, '\\\\') // Escape backslashes
        .replace(/"/g, '\\"') // Escape double quotes
        .replace(/'/g, "\\'") // Escape single quotes
        .replace(/</g, '&lt;') // Escape less than
        .replace(/>/g, '&gt;') // Escape greater than
        .replace(/&/g, '&amp;') // Escape ampersand
        .replace(/\//g, '\\/'); // Escape forward slash
}
