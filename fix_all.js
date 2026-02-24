const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            replaceInDir(fullPath);
        } else if (entry.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = content;

            updated = updated.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_URL!/g, "(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co')");
            updated = updated.replace(/process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY!/g, "(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key')");

            // To prevent double patching if someone runs it multiple times:
            updated = updated.replace(/\(\(process\.env/g, "(process.env").replace(/co'\)\)/g, "co')").replace(/key'\)\)/g, "key')");

            if (updated !== content) {
                fs.writeFileSync(fullPath, updated, 'utf8');
                console.log('Fixed', fullPath);
            }
        }
    }
}

replaceInDir(__dirname);
