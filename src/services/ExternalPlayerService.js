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
 * Uses the player's own intent scheme to check if it can be resolved
 */
export async function isAppInstalled(packageName) {
  if (Platform.OS !== 'android' || !packageName) {
    return false;
  }

  try {
    // Use a simple video intent to check if the package can handle it
    // This is more reliable than checking Play Store
    const intentUrl = `intent://video.test#Intent;package=${packageName};type=video/*;end`;
    const canOpen = await Linking.canOpenURL(intentUrl);

    if (!canOpen) {
      // Try alternative: check if package can open generic video intent
      const altIntentUrl = `intent://#Intent;package=${packageName};type=video/*;end`;
      return await Linking.canOpenURL(altIntentUrl);
    }

    return canOpen;
  } catch (error) {
    console.log(
      `[ExternalPlayer] Error checking if app is installed: ${error}`,
    );
    return false;
  }
}

/**
 * Generate VLC-specific URL with optional parameters
 * VLC supports various parameters for playback control
 * Headers can be passed via URL parameters
 */
function generateVLCUrl(videoUrl, title = '', headers = {}) {
  // VLC URL format: vlc://<url>
  // Headers can be passed as query parameters
  let urlWithHeaders = videoUrl;

  // Append headers as query parameters
  const headerParams = [];
  if (headers.Referer) {
    headerParams.push(`referer=${encodeURIComponent(headers.Referer)}`);
  }
  if (headers['User-Agent']) {
    headerParams.push(
      `http-user-agent=${encodeURIComponent(headers['User-Agent'])}`,
    );
  }
  if (headers['X-PlayToken'] || headers['x-playtoken']) {
    headerParams.push(
      `token=${encodeURIComponent(
        headers['X-PlayToken'] || headers['x-playtoken'],
      )}`,
    );
  }

  // Add custom headers if any
  Object.keys(headers).forEach(key => {
    if (
      ![
        'Referer',
        'User-Agent',
        'X-PlayToken',
        'x-playtoken',
        'Authorization',
      ].includes(key)
    ) {
      headerParams.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(headers[key])}`,
      );
    }
  });

  if (headerParams.length > 0) {
    const separator = videoUrl.includes('?') ? '&' : '?';
    urlWithHeaders = videoUrl + separator + headerParams.join('&');
  }

  const encodedUrl = encodeURIComponent(urlWithHeaders);
  return `vlc://${encodedUrl}`;
}

/**
 * Generate MX Player intent URL
 * MX Player uses Android intents for external playback
 * Headers can be passed via intent extras
 */
function generateMXPlayerUrl(videoUrl, title = '', headers = {}) {
  // MX Player intent format with headers support
  const encodedUrl = encodeURIComponent(videoUrl);

  let intentExtras = '';

  // Add Referer as extra
  if (headers.Referer) {
    intentExtras += `;com.mxtech.intent.extra.REFERER=${encodeURIComponent(
      headers.Referer,
    )}`;
  }

  // Add User-Agent as extra
  if (headers['User-Agent']) {
    intentExtras += `;com.mxtech.intent.extra.USER_AGENT=${encodeURIComponent(
      headers['User-Agent'],
    )}`;
  }

  // Add any custom headers
  if (headers['X-PlayToken'] || headers['x-playtoken']) {
    intentExtras += `;X-PlayToken=${encodeURIComponent(
      headers['X-PlayToken'] || headers['x-playtoken'],
    )}`;
  }

  return `intent:${encodedUrl}#Intent;type=video/*;package=com.mxtech.videoplayer.ad${intentExtras};end`;
}

/**
 * Generate Just Player intent URL
 * Just Player supports simple video/* intents
 * Headers can be passed via intent extras
 */
function generateJustPlayerUrl(videoUrl, title = '', headers = {}) {
  // Just Player can handle simple video URLs via intent
  const encodedUrl = encodeURIComponent(videoUrl);

  let intentExtras = '';

  // Add Referer as extra
  if (headers.Referer) {
    intentExtras += `;android.intent.extra.REFERRER=${encodeURIComponent(
      headers.Referer,
    )}`;
  }

  // Add headers as custom extra (Just Player may pass them through)
  if (headers['X-PlayToken'] || headers['x-playtoken']) {
    intentExtras += `;X-PlayToken=${encodeURIComponent(
      headers['X-PlayToken'] || headers['x-playtoken'],
    )}`;
  }

  return `intent:${encodedUrl}#Intent;type=video/*;package=com.brouken.player${intentExtras};end`;
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
  switch (playerId.toLowerCase()) {
    case 'vlc':
      return generateVLCUrl(videoUrl, title, headers);
    case 'mxplayer':
      return generateMXPlayerUrl(videoUrl, title, headers);
    case 'justplayer':
      return generateJustPlayerUrl(videoUrl, title, headers);
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

    console.log(
      `[ExternalPlayer] Launching ${player.name} with URL: ${videoUrl}`,
    );
    console.log(`[ExternalPlayer] Headers:`, headers);

    // Generate player-specific URL with headers
    const playerUrl = generatePlayerUrl(playerId, videoUrl, title, headers);

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
      console.log(
        `[ExternalPlayer] Intent failed, trying fallback: ${intentError}`,
      );

      // Fallback: try opening the video URL directly
      await Linking.openURL(videoUrl);
      return { success: true, player: player.name, fallback: true };
    }
  } catch (error) {
    console.error(`[ExternalPlayer] Error launching player: ${error}`);
    return {
      success: false,
      error: error.message,
      suggestion: 'Player may not be installed',
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
