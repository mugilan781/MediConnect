const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

// Windows-1252 reverse mapping
const charToByte = {};
for (let i = 0; i < 256; i++) {
    charToByte[String.fromCharCode(i)] = i;
}
// Add the extended windows-1252 mappings
const win1252Ext = {
    '\u20ac': 0x80, '\u201a': 0x82, '\u0192': 0x83, '\u201e': 0x84, '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87,
    '\u02c6': 0x88, '\u2030': 0x89, '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C, '\u017D': 0x8E,
    '\u2018': 0x91, '\u2019': 0x92, '\u201c': 0x93, '\u201d': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
    '\u02dc': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B, '\u0153': 0x9C, '\u017E': 0x9E, '\u0178': 0x9F
};
for (const [char, byte] of Object.entries(win1252Ext)) {
    charToByte[char] = byte;
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.html') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Look for mojibake. Mojibake starts with \u00e2 (for 3-byte utf8 chars) or \u00f0 (for 4-byte utf8 chars)
            // or \u00c2-\u00df (for 2-byte utf8 chars).
            // Let's use a regex to find these sequences and try to decode them.
            // A 3-byte UTF-8 char starts with E0-EF.
            // A 4-byte UTF-8 char starts with F0-F7.
            // E2 is very common. F0 9F is very common (emojis).
            
            // Regex to find things that look like double-encoded UTF-8
            // Basically any sequence of 2 to 4 characters where the first character is in the range of \u00c2 to \u00f4
            // and the subsequent characters map to bytes in the 0x80 - 0xBF range.
            
            let newContent = content.replace(/[\u00c2-\u00f4][\u0080-\u00bf\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178]+/g, (match) => {
                const bytes = [];
                for (let i = 0; i < match.length; i++) {
                    let b = charToByte[match[i]];
                    if (b === undefined) {
                        // Some chars might be standard control chars like \u0090
                        b = match.charCodeAt(i);
                    }
                    bytes.push(b);
                }
                
                // Decode bytes back to utf8
                try {
                    const decoded = Buffer.from(bytes).toString('utf8');
                    // If it decodes successfully without replacement characters, return it
                    if (!decoded.includes('\ufffd')) {
                        return decoded;
                    }
                } catch (e) {}
                
                return match;
            });
            
            // Sometimes emojis have variation selectors that were also mangled.
            // Let's run a manual pass for \u00e2\u2022\u0090 because it's so common in these files
            newContent = newContent.replace(/\u00e2\u2022\u0090/g, '═');
            newContent = newContent.replace(/\u00e2\u2022\u2018/g, '║');
            newContent = newContent.replace(/\u00f0\u0178\u201c\u0160/g, '📊'); // ðŸ“Š
            newContent = newContent.replace(/\u00e2\u0161\u2122\u00ef\u00b8\u008f/g, '⚙️'); // âš™ï¸ 
            
            if (content !== newContent) {
                console.log(`Fixed mojibake dynamically in ${fullPath}`);
                fs.writeFileSync(fullPath, newContent, 'utf8');
            }
        }
    }
}

console.log('Starting dynamic mojibake cleanup...');
processDirectory(publicDir);
console.log('Finished.');
