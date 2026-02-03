const fs = require('fs');
const path = require('path');

// Modules to check
const modulesToCheck = [
  '@fortawesome/fontawesome-svg-core',
  '@fortawesome/free-solid-svg-icons', 
  '@fortawesome/react-native-fontawesome',
  '@react-native-masked-view/masked-view',
  '@react-native/new-app-screen',
  'react-native-blob-util',
  'react-native-gesture-handler',
  'react-native-reanimated',
  'react-native-screens',
  'react-native-svg',
  'react-native-webview',
  'react-native-worklets'
];

// Directories to exclude
const excludeDirs = [
  'node_modules',
  'build',
  '.git',
  'android',
  'ios',
  'dist',
  '__tests__'
];

// File extensions to check
const validExtensions = ['.js', '.jsx', '.ts', '.tsx'];

function searchForImports(filePath, moduleName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check for ES6 imports
      if (trimmedLine.includes(`from '${moduleName}'`) || 
          trimmedLine.includes(`from "${moduleName}"`)) {
        return true;
      }
      
      // Check for require statements
      if (trimmedLine.includes(`require('${moduleName}')`) ||
          trimmedLine.includes(`require("${moduleName}")`)) {
        return true;
      }
      
      // Check for import without from (for side effects)
      if (trimmedLine.startsWith(`import '${moduleName}'`) ||
          trimmedLine.startsWith(`import "${moduleName}"`)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

function scanProject(dir) {
  const results = {};
  modulesToCheck.forEach(module => {
    results[module] = { used: false, files: [] };
  });

  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      
      // Skip excluded directories
      if (fs.statSync(fullPath).isDirectory()) {
        if (!excludeDirs.includes(item) && !item.startsWith('.')) {
          traverse(fullPath);
        }
        continue;
      }
      
      // Check only valid file extensions
      const ext = path.extname(item);
      if (!validExtensions.includes(ext)) {
        continue;
      }
      
      // Skip the analyzer file itself
      if (item === 'analyze-imports.js' || item === 'check-imports.js') {
        continue;
      }
      
      // Check each module
      for (const module of modulesToCheck) {
        if (searchForImports(fullPath, module)) {
          results[module].used = true;
          results[module].files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return results;
}

// Run analysis
console.log('🔍 Analyzing project for module usage...\n');
const results = scanProject(process.cwd());

let usedCount = 0;
let unusedCount = 0;

console.log('📊 MODULE USAGE REPORT:');
console.log('=' .repeat(50));

for (const [module, data] of Object.entries(results)) {
  if (data.used) {
    usedCount++;
    console.log(`\n❌ ${module} - USED in ${data.files.length} file(s):`);
    data.files.slice(0, 3).forEach(file => {
      console.log(`   ${path.relative(process.cwd(), file)}`);
    });
    if (data.files.length > 3) {
      console.log(`   ... and ${data.files.length - 3} more files`);
    }
  } else {
    unusedCount++;
    console.log(`\n✅ ${module} - NOT USED (safe to remove)`);
  }
}

console.log('\n' + '=' .repeat(50));
console.log(`📈 SUMMARY:`);
console.log(`   Used modules: ${usedCount}`);
console.log(`   Unused modules: ${unusedCount}`);
console.log(`   Total checked: ${modulesToCheck.length}`);

if (unusedCount > 0) {
  console.log('\n💡 RECOMMENDATION:');
  console.log('You can safely remove these modules:');
  for (const [module, data] of Object.entries(results)) {
    if (!data.used) {
      console.log(`   npm uninstall ${module}`);
    }
  }
}