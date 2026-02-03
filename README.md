# Movie Mandir

Movie Mandir is a personalized, high-performance video streaming application built with React Native. It features a completely dynamic, remotely controlled **Server-Driven UI (SDUI)** secret channel for direct support, VIP content, and live dashboards.

## ✨ Features

- 🎥 **Video Streaming**: Seamless playback experience using `react-native-video`.
- 📱 **Modern UI**: Beautiful, intuitive interface with category filtering and deep details for Movies and Series.
- 🔐 **Secret Channel (SDUI)**: A hidden dashboard accessible via a long press on the header, controlled entirely from the server (Supabase).
- 💬 **Live Support**: Real-time chat integration with Supabase for instant communication with admins.
- 🔒 **Secured Content**: Support for passcode-locked images and videos within the secret channel.
- 🖼️ **Cloudinary Optimized**: High-performance media serving with dynamic transformations.

## 🚀 Tech Stack

- **Frontend**: React Native
- **Backend/DB**: Supabase (PostgreSQL + Realtime)
- **Media**: Cloudinary
- **UI Engine**: Custom SDUI Renderer
- **Navigation**: React Navigation

## 🛠️ Setup Instructions

### 1. Prerequisites
- React Native development environment.
- Supabase Project.
- Cloudinary Account (optional).

### 2. Installation
```bash
git clone https://github.com/Saikumar-bali/movie_mandir.git
cd movie_mandir
npm install
```

### 3. Environment Configuration
Create a file named `src/config/env.js` and copy the structure from `src/config/env.example.js`. Fill in your credentials:

```javascript
export const ENV = {
  SUPABASE_URL: 'your_url',
  SUPABASE_ANON_KEY: 'your_key',
  // ... other keys
};
```

### 4. Supabase SQL Setup
Run the `supabase_setup.sql` script in your Supabase SQL Editor to create the necessary tables (`app_config`, `support_messages`) and enable Realtime.

### 5. Run the App
```bash
npx react-native run-android
# or
npx react-native run-ios
```

## 📦 Publishing & Deployment

### 🤖 GitHub Actions (Auto-Build)
This repository includes a GitHub Action that automatically attempts to build an unsigned **Release APK** every time you push to the `main` branch. 
- You can find the builds in the **Actions** tab of your GitHub repository.
- To sign the app for the Play Store, you will need to set up [Android Signing Secrets](https://reactnative.dev/docs/signed-apk-android).

### 🚀 Manual Build (Android)
To build the app manually on your computer:
```bash
cd android
./gradlew assembleRelease
```
The APK will be located at: `android/app/build/outputs/apk/release/app-release.apk`

## 🛠️ Secret Channel Management

The Secret Channel uses a JSON layout stored in Supabase. You can change the entire UI of that screen instantly by updating the `layout` column in the `app_config` table.

**Example Layout JSON:**
```json
[
  {"type": "text", "text": "VIP Dashboard", "style": "h1"},
  {"type": "slider", "images": ["url1", "url2"], "interval": 3000, "height": 200},
  {"type": "chat", "title": "Admin Help"}
]
```

## 📄 License
This project is for private use and educational purposes.
