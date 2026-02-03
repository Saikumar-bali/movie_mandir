const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../src/config/env.js');

const envContent = `export const ENV = {
    API_BASE_URL: '${process.env.API_BASE_URL || ''}',
    API_AUTH_CODE: '${process.env.API_AUTH_CODE || ''}',
    IMAGE_BASE_URL: '${
      process.env.IMAGE_BASE_URL || 'https://image.tmdb.org/t/p/w500/'
    }',
    BACKEND_URL: '${process.env.BACKEND_URL || ''}',
    MOVIE_API_KEY: '${process.env.MOVIE_API_KEY || ''}',
    SUPABASE_URL: '${process.env.SUPABASE_URL || ''}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY || ''}',
};
`;

// Ensure the config directory exists
const configDir = path.dirname(envPath);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Write the env file
fs.writeFileSync(envPath, envContent, 'utf8');
console.log('✅ env.js generated successfully');
