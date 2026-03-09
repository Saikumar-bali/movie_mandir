import { Linking, Platform } from 'react-native';

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
    webUrl:
      'https://play.google.com/store/apps/details?id=com.mxtech.videoplayer.ad',
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
 * Note: Due to Android security restrictions, reliably detecting installed apps
 * via Linking.canOpenURL is not possible. We instead try to launch and catch errors.
 * This function now always returns true for external players to allow attempting launch.
 */
export async function isAppInstalled(packageName) {
  if (Platform.OS !== 'android' || !packageName) {
    return false;
  }

  // Return true to allow attempting launch - we'll handle "not installed" case when launching
  // This is more reliable than canOpenURL which doesn't work well with intent URLs
  return true;
}

/**
 * Generate VLC-specific URL
 * User requested to use vlc:// scheme specifically.
 */
function generateVLCUrl(videoUrl, title = '', headers = {}) {
  // VLC Android can take the URL directly after vlc://
  // For vlc:// scheme, we should NOT encode the http:// part
  // vlc://http://example.com/video.mp4
  const finalUrl = `vlc://${videoUrl}`;
  console.log(`[ExternalPlayer] Final VLC URL: ${finalUrl}`);
  return finalUrl;
}

/**
 * Generate MX Player intent URL
 */
function generateMXPlayerUrl(videoUrl, title = '', headers = {}) {
  // Standard Android Intent URI format: 
  // intent://URL_WITHOUT_SCHEME#Intent;scheme=ORIGINAL_SCHEME;action=android.intent.action.VIEW;package=com.mxtech.videoplayer.ad;S.title=TITLE;end
  
  let scheme = 'http';
  let rest = videoUrl;
  
  if (videoUrl.includes('://')) {
    const parts = videoUrl.split('://');
    scheme = parts[0];
    rest = parts[1];
  } else if (videoUrl.startsWith('/')) {
    scheme = 'file';
    rest = videoUrl;
  }

  // Ensure rest doesn't start with // if we are prepending //
  const normalizedRest = rest.startsWith('//') ? rest.substring(2) : rest;
  let intent = `intent://${normalizedRest}#Intent;scheme=${scheme};action=android.intent.action.VIEW;package=com.mxtech.videoplayer.ad`;
  
  if (title) {
    intent += `;S.title=${encodeURIComponent(title)}`;
  }

  // MX Player supports headers via S.headers extra, separated by \r\n
  const headerStrings = [];
  Object.keys(headers).forEach(key => {
    headerStrings.push(`${key}:${headers[key]}`);
  });

  if (headerStrings.length > 0) {
    const headersValue = headerStrings.join('\r\n');
    intent += `;S.headers=${encodeURIComponent(headersValue)}`;
  }

  intent += ';end';
  console.log(`[ExternalPlayer] Final MX Player Intent: ${intent}`);
  return intent;
}

/**
 * Generate Just Player intent URL
 */
function generateJustPlayerUrl(videoUrl, title = '', headers = {}) {
  // Similar to MX Player format
  let scheme = 'http';
  let rest = videoUrl;
  
  if (videoUrl.includes('://')) {
    const parts = videoUrl.split('://');
    scheme = parts[0];
    rest = parts[1];
  } else if (videoUrl.startsWith('/')) {
    scheme = 'file';
    rest = videoUrl;
  }

  // Ensure rest doesn't start with // if we are prepending //
  const normalizedRest = rest.startsWith('//') ? rest.substring(2) : rest;
  let intent = `intent://${normalizedRest}#Intent;scheme=${scheme};action=android.intent.action.VIEW;package=com.brouken.player`;
  
  if (title) {
    intent += `;S.title=${encodeURIComponent(title)}`;
  }
  
  const headerStrings = [];
  Object.keys(headers).forEach(key => {
    headerStrings.push(`${key}:${headers[key]}`);
  });
  
  if (headerStrings.length > 0) {
    const headersValue = headerStrings.join('\r\n');
    intent += `;S.headers=${encodeURIComponent(headersValue)}`;
  }

  intent += ';end';
  console.log(`[ExternalPlayer] Final Just Player Intent: ${intent}`);
  return intent;
}

/**
 * Generate player-specific URL based on player ID
 */
export function generatePlayerUrl(
  playerId,
  videoUrl,
  title = '',
  headers = {},
) {
  const pid = playerId.toLowerCase();
  if (pid === 'vlc') {
    return generateVLCUrl(videoUrl, title, headers);
  } else if (pid === 'mxplayer') {
    return generateMXPlayerUrl(videoUrl, title, headers);
  } else if (pid === 'justplayer') {
    return generateJustPlayerUrl(videoUrl, title, headers);
  }
  return videoUrl;
}

/**
 * Launch external player with the given URL
 */
export async function launchExternalPlayer(
  playerId,
  videoUrl,
  title = '',
  headers = {},
) {
  try {
    const player = EXTERNAL_PLAYERS.find(p => p.id === playerId.toLowerCase());

    if (!player) {
      throw new Error(`Unknown player: ${playerId}`);
    }

    if (!player.isExternal) {
      throw new Error(`Player ${playerId} is not an external player`);
    }

    // Generate player-specific URL
    const playerUrl = generatePlayerUrl(playerId, videoUrl, title, headers);

    console.log(`[ExternalPlayer] Attempting to launch ${player.name}`);
    console.log(`[ExternalPlayer] Target URL: ${playerUrl}`);

    // We skip Linking.canOpenURL as it is unreliable for intent:// URLs on Android
    // Instead we try to open and catch the "Activity not found" error
    try {
      await Linking.openURL(playerUrl);
      return { success: true, player: player.name };
    } catch (launchError) {
      console.log(`[ExternalPlayer] Launch failed: ${launchError.message}`);

      // Check if the error indicates the app is not installed
      const errorMsg = launchError.message || '';
      if (
        errorMsg.includes('No Activity found') || 
        errorMsg.includes('not found') ||
        errorMsg.includes('unable to parse')
      ) {
        console.log(`[ExternalPlayer] Player ${player.name} not found, requesting install`);
        return {
          success: false,
          error: 'Player not installed',
          notInstalled: true,
          player: player.name,
          packageName: player.packageName,
        };
      }

      // Fallback: try opening the video URL directly if intent failed for other reasons
      console.log(`[ExternalPlayer] Attempting fallback to direct URL`);
      try {
        await Linking.openURL(videoUrl);
        return { success: true, player: player.name, fallback: true };
      } catch (fallbackError) {
        throw launchError; // Throw original error if fallback also fails
      }
    }
  } catch (error) {
    console.error(`[ExternalPlayer] Error in launchExternalPlayer: ${error}`);

    const errorMsg = error.message || '';
    const isNotInstalled =
      errorMsg.includes('No Activity found') ||
      errorMsg.includes('not found') ||
      errorMsg.includes('unable to parse');

    return {
      success: false,
      error: error.message,
      notInstalled: isNotInstalled,
      player: playerId,
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
      console.log(
        `[ExternalPlayer] Play Store failed, opening web: ${storeError}`,
      );
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
    EXTERNAL_PLAYERS.map(async player => {
      const status = await getPlayerStatus(player.id);
      return {
        ...player,
        ...status,
      };
    }),
  );

  return playersWithStatus;
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

  if (!player) {
    return { success: false, error: 'Unknown player selected' };
  }

  // Built-in player doesn't need external launch
  if (!player.isExternal) {
    return { success: true, useExternal: false };
  }

  // Check if player is installed (now returns true by default to allow attempt)
  const status = await getPlayerStatus(playerId);

  if (!status.available) {
    // If we somehow know it's not installed before attempting
    if (onNotInstalled) {
      onNotInstalled(player);
    }
    return { success: false, notInstalled: true, player };
  }

  // Launch the player
  const result = await launchExternalPlayer(playerId, videoUrl, title, headers);

  // If launch reported "not installed", trigger the callback
  if (result.notInstalled && onNotInstalled) {
    console.log(`[ExternalPlayer] Launch result reported NOT INSTALLED, triggering callback`);
    onNotInstalled(player);
  }

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
