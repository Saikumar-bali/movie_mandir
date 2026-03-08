import { Linking, Platform, Alert } from 'react-native';

/**
 * External Player Configuration
 * Defines supported external video players and their launch methods
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
    urlScheme: null,
  },
  {
    id: 'vlc',
    name: 'VLC Player',
    description: 'Plays everything',
    icon: 'traffic',
    color: '#ff8800',
    packageName: 'org.videolan.vlc',
    urlScheme: 'vlc://',
    isExternal: true,
    playStoreUrl: 'market://details?id=org.videolan.vlc',
    webUrl: 'https://play.google.com/store/apps/details?id=org.videolan.vlc',
  },
  {
    id: 'mxplayer',
    name: 'MX Player',
    description: 'Powerful video player',
    icon: 'play-box-outline',
    color: '#00a8ff',
    packageName: 'com.mxtech.videoplayer.ad',
    urlScheme: null,
    isExternal: true,
    playStoreUrl: 'market://details?id=com.mxtech.videoplayer.ad',
    webUrl: 'https://play.google.com/store/apps/details?id=com.mxtech.videoplayer.ad',
  },
  {
    id: 'justplayer',
    name: 'Just (Video) Player',
    description: 'Lightweight ExoPlayer',
    icon: 'video',
    color: '#00d2d3',
    packageName: 'com.brouken.player',
    urlScheme: null,
    isExternal: true,
    playStoreUrl: 'market://details?id=com.brouken.player',
    webUrl: 'https://play.google.com/store/apps/details?id=com.brouken.player',
  },
];

/**
 * Check if a package is installed (Android only)
 * Note: This requires android.permission.QUERY_ALL_PACKAGES or specific package queries
 * For production, use the <queries> tag in AndroidManifest.xml
 */
export async function isAppInstalled(packageName) {
  if (Platform.OS !== 'android' || !packageName) {
    return false;
  }

  try {
    // Try to open the app using package name via intent
    const intentUrl = `market://details?id=${packageName}`;
    const canOpen = await Linking.canOpenURL(intentUrl);
    return canOpen;
  } catch (error) {
    console.log(`[ExternalPlayer] Error checking if app is installed: ${error}`);
    return false;
  }
}

/**
 * Generate VLC-specific URL with optional parameters
 * VLC supports various parameters for playback control
 */
function generateVLCUrl(videoUrl, title = '') {
  // VLC URL format: vlc://<url>
  // Some versions support: vlc://<url>?title=<title>
  const encodedUrl = encodeURIComponent(videoUrl);
  return `vlc://${encodedUrl}`;
}

/**
 * Generate MX Player intent URL
 * MX Player uses Android intents for external playback
 */
function generateMXPlayerUrl(videoUrl, title = '') {
  // MX Player intent format
  const encodedUrl = encodeURIComponent(videoUrl);
  return `intent:${encodedUrl}#Intent;type=video/*;package=com.mxtech.videoplayer.ad;end`;
}

/**
 * Generate Just Player intent URL
 * Just Player supports simple video/* intents
 */
function generateJustPlayerUrl(videoUrl, title = '') {
  // Just Player can handle simple video URLs via intent
  const encodedUrl = encodeURIComponent(videoUrl);
  return `intent:${encodedUrl}#Intent;type=video/*;package=com.brouken.player;end`;
}

/**
 * Generate player-specific URL based on player ID
 */
export function generatePlayerUrl(playerId, videoUrl, title = '') {
  switch (playerId.toLowerCase()) {
    case 'vlc':
      return generateVLCUrl(videoUrl, title);
    case 'mxplayer':
      return generateMXPlayerUrl(videoUrl, title);
    case 'justplayer':
      return generateJustPlayerUrl(videoUrl, title);
    default:
      return videoUrl;
  }
}

/**
 * Launch external player with the given URL
 * @param {string} playerId - ID of the player to launch
 * @param {string} videoUrl - Video URL to play
 * @param {string} title - Optional video title
 * @param {object} headers - Optional headers (note: external players may not support these)
 */
export async function launchExternalPlayer(playerId, videoUrl, title = '', headers = {}) {
  try {
    const player = EXTERNAL_PLAYERS.find(p => p.id === playerId.toLowerCase());
    
    if (!player) {
      throw new Error(`Unknown player: ${playerId}`);
    }

    if (!player.isExternal) {
      throw new Error(`Player ${playerId} is not an external player`);
    }

    console.log(`[ExternalPlayer] Launching ${player.name} with URL: ${videoUrl}`);

    // Generate player-specific URL
    const playerUrl = generatePlayerUrl(playerId, videoUrl, title);

    // For VLC, we can use the URL scheme directly
    if (playerId.toLowerCase() === 'vlc') {
      await Linking.openURL(playerUrl);
      return { success: true, player: player.name };
    }

    // For other players using intents
    try {
      await Linking.openURL(playerUrl);
      return { success: true, player: player.name };
    } catch (intentError) {
      console.log(`[ExternalPlayer] Intent failed, trying fallback: ${intentError}`);
      
      // Fallback: try opening the video URL directly
      await Linking.openURL(videoUrl);
      return { success: true, player: player.name, fallback: true };
    }

  } catch (error) {
    console.error(`[ExternalPlayer] Error launching player: ${error}`);
    return { 
      success: false, 
      error: error.message,
      suggestion: 'Player may not be installed'
    };
  }
}

/**
 * Open Play Store or web page to install a player
 */
export async function installPlayer(playerId) {
  try {
    const player = EXTERNAL_PLAYERS.find(p => p.id === playerId.toLowerCase());
    
    if (!player || !player.playStoreUrl) {
      throw new Error(`Cannot install player: ${playerId}`);
    }

    // Try Play Store first
    try {
      await Linking.openURL(player.playStoreUrl);
      return { success: true };
    } catch (storeError) {
      // Fallback to web URL
      console.log(`[ExternalPlayer] Play Store failed, opening web: ${storeError}`);
      await Linking.openURL(player.webUrl);
      return { success: true, fallback: true };
    }

  } catch (error) {
    console.error(`[ExternalPlayer] Error installing player: ${error}`);
    return { success: false, error: error.message };
  }
}

/**
 * Check if external player is available and return status
 */
export async function getPlayerStatus(playerId) {
  const player = EXTERNAL_PLAYERS.find(p => p.id === playerId.toLowerCase());
  
  if (!player) {
    return { available: false, reason: 'Unknown player' };
  }

  if (!player.isExternal) {
    return { available: true, reason: 'Built-in player' };
  }

  const isInstalled = await isAppInstalled(player.packageName);
  
  return {
    available: isInstalled,
    installed: isInstalled,
    packageName: player.packageName,
    installUrl: player.playStoreUrl,
  };
}

/**
 * Get all available players with their status
 */
export async function getAvailablePlayers() {
  const playersWithStatus = await Promise.all(
    EXTERNAL_PLAYERS.map(async (player) => {
      const status = await getPlayerStatus(player.id);
      return {
        ...player,
        ...status,
      };
    })
  );

  return playersWithStatus;
}

/**
 * Handle player launch with error handling and user feedback
 */
export async function handlePlayerLaunch(playerId, videoUrl, title = '', headers = {}, onNotInstalled) {
  const player = EXTERNAL_PLAYERS.find(p => p.id === playerId.toLowerCase());
  
  if (!player) {
    return { success: false, error: 'Unknown player selected' };
  }

  // Built-in player doesn't need external launch
  if (!player.isExternal) {
    return { success: true, useExternal: false };
  }

  // Check if player is installed
  const status = await getPlayerStatus(playerId);
  
  if (!status.available) {
    // Player not installed, trigger install flow
    if (onNotInstalled) {
      onNotInstalled(player);
    }
    return { success: false, notInstalled: true, player };
  }

  // Launch the player
  const result = await launchExternalPlayer(playerId, videoUrl, title, headers);
  
  return {
    success: result.success,
    useExternal: true,
    player: player.name,
    ...result,
  };
}

export default {
  EXTERNAL_PLAYERS,
  isAppInstalled,
  generatePlayerUrl,
  launchExternalPlayer,
  installPlayer,
  getPlayerStatus,
  getAvailablePlayers,
  handlePlayerLaunch,
};
