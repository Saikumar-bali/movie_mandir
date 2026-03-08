const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules', 'rn-fetch-blob', 'android', 'build.gradle');

try {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace jcenter() with mavenCentral()
        content = content.replace(/jcenter\(\)/g, 'mavenCentral()');

        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✅ Successfully patched rn-fetch-blob to use mavenCentral()');
    } else {
        console.log('⚠️  File not found:', filePath);
    }
} catch (error) {
    console.error('❌ Error patching rn-fetch-blob:', error.message);
    process.exit(1);
}
