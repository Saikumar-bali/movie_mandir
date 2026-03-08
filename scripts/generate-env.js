const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../src/config/env.js');

// Required environment variables
const requiredVars = [
  'API_BASE_URL',
  'API_AUTH_CODE',
  'BACKEND_URL',
  'MOVIE_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'APK_VERIFY_SECRET',
  'PLAYBACK_DEFAULT_REFERER',
  'PLAYBACK_DEFAULT_USER_AGENT',
  'PLAYBACK_X_REQUEST_X',
  'PLAYBACK_ACCEPT_ENCODING',
];

// Optional variables with defaults (only public/non-sensitive defaults)
const optionalVars = {
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500/',
};

// Validate required variables
const missing = requiredVars.filter(varName => !process.env[varName]);
if (missing.length > 0) {
  console.error(
    '❌ Missing required environment variables:',
    missing.join(', '),
  );
  console.error('Please set these secrets in GitHub repository settings.');
  process.exit(1);
}

// Build env object
const env = {};
requiredVars.forEach(varName => {
  env[varName] = process.env[varName];
});
Object.keys(optionalVars).forEach(varName => {
  env[varName] = process.env[varName] || optionalVars[varName];
});

// Generate file content
const envContent = `// Auto-generated from GitHub Secrets - DO NOT COMMIT
export const ENV = {
    API_BASE_URL: '${env.API_BASE_URL}',
    API_AUTH_CODE: '${env.API_AUTH_CODE}',
    IMAGE_BASE_URL: '${env.IMAGE_BASE_URL}',
    BACKEND_URL: '${env.BACKEND_URL}',
    MOVIE_API_KEY: '${env.MOVIE_API_KEY}',
    SUPABASE_URL: '${env.SUPABASE_URL}',
    SUPABASE_ANON_KEY: '${env.SUPABASE_ANON_KEY}',
    APK_VERIFY_SECRET: '${env.APK_VERIFY_SECRET}',
    PLAYBACK_DEFAULT_REFERER: '${env.PLAYBACK_DEFAULT_REFERER}',
    PLAYBACK_DEFAULT_USER_AGENT: '${env.PLAYBACK_DEFAULT_USER_AGENT}',
    PLAYBACK_X_REQUEST_X: '${env.PLAYBACK_X_REQUEST_X}',
    PLAYBACK_ACCEPT_ENCODING: '${env.PLAYBACK_ACCEPT_ENCODING}',
};
`;

// Ensure the config directory exists
const configDir = path.dirname(envPath);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Write the env file
fs.writeFileSync(envPath, envContent, 'utf8');
console.log(
  '✅ env.js generated successfully from',
  Object.keys(env).length,
  'environment variables',
);
