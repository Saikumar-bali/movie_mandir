import { Linking, Platform } from 'react-native';
import IntentLauncher from 'react-native-intent-launcher';

/**
 * External Player Configuration
 * Defines supported external video players and their package names
 */
export const EXTERNAL_PLAYERS = [
  {
    id: 'builtin',
    name: 'Built-in Player',
    description: 'Native React Native player',
    icon: 'play-circle-outline',
    color: '#ff375f',
    isExternal: false,
    packageName: null,
    logo: require('../assets/logo.png'),
  },
  {
    id: 'vlc',
    name: 'VLC Player',
    description: 'Plays everything',
    icon: 'traffic',
    color: '#ff8800',
    packageName: 'org.videolan.vlc',
    isExternal: true,
    playStoreUrl: 'market://details?id=org.videolan.vlc',
    webUrl: 'https://play.google.com/store/apps/details?id=org.videolan.vlc',
    logo: require('../assets/vlc.png'),
  },
  {
    id: 'mxplayer',
    name: 'MX Player',
    description: 'Powerful video player',
    icon: 'play-box-outline',
    color: '#00a8ff',
    packageName: 'com.mxtech.videoplayer.ad',
    isExternal: true,
    playStoreUrl: 'market://details?id=com.mxtech.videoplayer.ad',
    webUrl:
      'https://play.google.com/store/apps/details?id=com.mxtech.videoplayer.ad',
    logo: require('../assets/mxplayer.png'),
  },
  {
    id: 'justplayer',
    name: 'Just (Video) Player',
    description: 'Lightweight ExoPlayer',
    icon: 'video',
    color: '#00d2d3',
    packageName: 'com.brouken.player',
    isExternal: true,
    playStoreUrl: 'market://details?id=com.brouken.player',
    webUrl: 'https://play.google.com/store/apps/details?id=com.brouken.player',
    logo: require('../assets/justplayer.png'),
  },
];

/**
 * Check if a package is installed (Android only)
 */
export async function isAppInstalled(packageName) {
  if (Platform.OS !== 'android' || !packageName) {
    return false;
  }
  
  try {
    // We use the patched IntentLauncher's isAppInstalled method
    return await IntentLauncher.isAppInstalled(packageName);
  } catch (e) {
    // Fallback: If the method fails or app not found, return false
    return false; 
  }
}

/**
 * Generate player-specific URL (Legacy/Compatibility)
 */
export function generatePlayerUrl(playerId, videoUrl, title = '', headers = {}) {
  return videoUrl;
}

/**
 * Launch external player with the given URL and configuration
 */
export async function launchExternalPlayer(
  playerId,
  videoUrl,
  title = '',
  headers = {},
) {
  if (Platform.OS !== 'android') {
    return { success: false, error: 'External players are only supported on Android' };
  }

  try {
    const player = EXTERNAL_PLAYERS.find(p => p.id === playerId.toLowerCase());

    if (!player || !player.isExternal) {
      throw new Error(`Invalid player: ${playerId}`);
    }

    console.log(`[ExternalPlayer] Launching ${player.name} for: ${videoUrl}`);

    // Prepare Intent Extras
    const extras = {};
    
    // Add title if supported
    if (title) {
      extras['title'] = title; // VLC & MX
    }

    // Handle Headers (User-Agent, Referer)
    if (headers && Object.keys(headers).length > 0) {
      if (playerId === 'vlc') {
        // VLC specific headers
        if (headers['User-Agent']) extras['http-user-agent'] = headers['User-Agent'];
        if (headers['Referer']) extras['http-referrer'] = headers['Referer'];
      } else if (playerId === 'mxplayer' || playerId === 'justplayer') {
        // MX Player & Just Player use 'headers' extra (String array)
        const headerList = Object.keys(headers).map(key => `${key}: ${headers[key]}`);
        extras['headers'] = headerList;
      }
    }

    try {
      // Launch using patched IntentLauncher with explicit packageName
      await IntentLauncher.startActivity({
        action: 'android.intent.action.VIEW',
        data: videoUrl,
        type: 'video/*',
        packageName: player.packageName, // Matches patched IntentLauncherModule.java
        extra: extras,
      });

      return { success: true, player: player.name };
    } catch (launchError) {
      console.log(`[ExternalPlayer] Specific package launch failed: ${launchError.message}`);
      
      // If launch fails, it's likely not installed or another issue
      return {
        success: false,
        error: 'Player launch failed',
        notInstalled: true, // We assume not installed to trigger the prompt
        player: player.name,
        packageName: player.packageName,
      };
    }
  } catch (error) {
    console.error(`[ExternalPlayer] Error: ${error.message}`);
    
    // Fallback: Use System Chooser if specific launch fails for other reasons
    try {
      console.log(`[ExternalPlayer] Attempting fallback to system chooser`);
      await IntentLauncher.startActivity({
        action: 'android.intent.action.VIEW',
        data: videoUrl,
        type: 'video/*',
      });
      return { success: true, fallback: true };
    } catch (fallbackError) {
      return {
        success: false,
        error: error.message,
        notInstalled: false,
      };
    }
  }
}

/**
 * Open Play Store or web page to install a player
 */
export async function installPlayer(playerId) {
  try {
    const player = EXTERNAL_PLAYERS.find(p => p.id === playerId.toLowerCase());
    if (!player || !player.playStoreUrl) return { success: false };

    await Linking.openURL(player.playStoreUrl).catch(() => Linking.openURL(player.webUrl));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Handle player launch with error handling and user feedback
 */
export async function handlePlayerLaunch(
  playerId,
  videoUrl,
  title = '',
  headers = {},
  onNotInstalled,
) {
  const player = EXTERNAL_PLAYERS.find(p => p.id === playerId.toLowerCase());

  if (!player) return { success: false, error: 'Unknown player' };
  if (!player.isExternal) return { success: true, useExternal: false };

  // Check if player is installed first
  const installed = await isAppInstalled(player.packageName);
  
  if (!installed && onNotInstalled) {
    onNotInstalled(player);
    return { success: false, notInstalled: true, player };
  }

  const result = await launchExternalPlayer(playerId, videoUrl, title, headers);

  if (result.notInstalled && onNotInstalled) {
    onNotInstalled(player);
  }

  return {
    success: result.success,
    useExternal: true,
    player: player.name,
    ...result,
  };
}

/**
 * Check if external player is available (Used for UI state if needed)
 */
export async function getPlayerStatus(playerId) {
  const player = EXTERNAL_PLAYERS.find(p => p.id === playerId.toLowerCase());
  if (!player || !player.isExternal) return { available: true };
  
  const installed = await isAppInstalled(player.packageName);
  return { available: installed, packageName: player.packageName };
}

export default {
  EXTERNAL_PLAYERS,
  isAppInstalled,
  generatePlayerUrl,
  launchExternalPlayer,
  installPlayer,
  handlePlayerLaunch,
  getPlayerStatus,
};
