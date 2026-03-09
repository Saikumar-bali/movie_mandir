const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const gradleFile = path.join(root, 'node_modules', 'react-native-intent-launcher', 'android', 'build.gradle');
const javaFile = path.join(root, 'node_modules', 'react-native-intent-launcher', 'android', 'src', 'main', 'java', 'com', 'poberwong', 'launcher', 'IntentLauncherModule.java');

// 1. Patch build.gradle
if (fs.existsSync(gradleFile)) {
    console.log('Patching build.gradle...');
    let content = fs.readFileSync(gradleFile, 'utf8');
    content = content.replace(/compile /g, 'implementation ');
    content = content.replace(/com\.android\.support:appcompat-v7:\+/g, 'androidx.appcompat:appcompat:1.1.0');
    fs.writeFileSync(gradleFile, content);
}

// 2. Patch Java code to support 'package' and better intent handling
if (fs.existsSync(javaFile)) {
    console.log('Patching IntentLauncherModule.java...');
    let content = fs.readFileSync(javaFile, 'utf8');
    
    // Add setPackage support if packageName is provided but className is NOT
    if (!content.includes('intent.setPackage(params.getString(ATTR_PACKAGE_NAME))')) {
        const packageCheck = `if (params.hasKey(ATTR_PACKAGE_NAME)) {
            intent.setPackage(params.getString(ATTR_PACKAGE_NAME));
        }`;
        
        // Find a good place to insert it. After setting action maybe.
        content = content.replace('if (params.hasKey(ATTR_ACTION)) {', `${packageCheck}\n        if (params.hasKey(ATTR_ACTION)) {`);
    }
    
    fs.writeFileSync(javaFile, content);
}

console.log('Patches applied successfully.');
