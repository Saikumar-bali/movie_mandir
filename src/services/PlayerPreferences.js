import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  DEFAULT_PLAYER: '@movieblast_default_player',
  ALWAYS_ASK: '@movieblast_always_ask_player',
  LAST_USED_PLAYER: '@movieblast_last_used_player',
};

/**
 * Get the user's default player preference
 * @returns {Promise<string|null>} Player ID or null if not set
 */
export async function getDefaultPlayer() {
  try {
    const playerId = await AsyncStorage.getItem(STORAGE_KEYS.DEFAULT_PLAYER);
    return playerId;
  } catch (error) {
    console.error('[PlayerPreferences] Error getting default player:', error);
    return null;
  }
}

/**
 * Set the user's default player preference
 * @param {string} playerId - ID of the player to set as default
 * @returns {Promise<boolean>} Success status
 */
export async function setDefaultPlayer(playerId) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.DEFAULT_PLAYER, playerId);
    return true;
  } catch (error) {
    console.error('[PlayerPreferences] Error setting default player:', error);
    return false;
  }
}

/**
 * Check if user wants to always be asked for player selection
 * @returns {Promise<boolean>} True if always ask is enabled
 */
export async function getAlwaysAsk() {
  try {
    const alwaysAsk = await AsyncStorage.getItem(STORAGE_KEYS.ALWAYS_ASK);
    return alwaysAsk === 'true';
  } catch (error) {
    console.error('[PlayerPreferences] Error getting always ask:', error);
    return true; // Default to always ask
  }
}

/**
 * Set whether to always ask for player selection
 * @param {boolean} value - True to always ask, false to use default
 * @returns {Promise<boolean>} Success status
 */
export async function setAlwaysAsk(value) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ALWAYS_ASK, value.toString());
    return true;
  } catch (error) {
    console.error('[PlayerPreferences] Error setting always ask:', error);
    return false;
  }
}

/**
 * Get the last used player
 * @returns {Promise<string|null>} Last used player ID or null
 */
export async function getLastUsedPlayer() {
  try {
    const playerId = await AsyncStorage.getItem(STORAGE_KEYS.LAST_USED_PLAYER);
    return playerId;
  } catch (error) {
    console.error('[PlayerPreferences] Error getting last used player:', error);
    return null;
  }
}

/**
 * Set the last used player (for quick re-selection)
 * @param {string} playerId - ID of the player that was used
 * @returns {Promise<boolean>} Success status
 */
export async function setLastUsedPlayer(playerId) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_USED_PLAYER, playerId);
    return true;
  } catch (error) {
    console.error('[PlayerPreferences] Error setting last used player:', error);
    return false;
  }
}

/**
 * Clear all player preferences
 * @returns {Promise<boolean>} Success status
 */
export async function clearAllPreferences() {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    return true;
  } catch (error) {
    console.error('[PlayerPreferences] Error clearing preferences:', error);
    return false;
  }
}

/**
 * Handle player selection with preference management
 * @param {string} playerId - Selected player ID
 * @param {boolean} rememberChoice - Whether to remember this choice
 * @returns {Promise<object>} Result with action to take
 */
export async function handlePlayerSelection(playerId, rememberChoice = false) {
  try {
    // Always track last used player
    await setLastUsedPlayer(playerId);

    // If user wants to remember this choice, set as default
    if (rememberChoice) {
      await setDefaultPlayer(playerId);
      await setAlwaysAsk(false);
    }

    return {
      success: true,
      playerId,
      isDefault: rememberChoice,
    };
  } catch (error) {
    console.error('[PlayerPreferences] Error handling player selection:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get player selection behavior
 * Returns information about how to handle player selection
 * @returns {Promise<object>} Selection behavior config
 */
export async function getPlayerSelectionConfig() {
  try {
    const [defaultPlayer, alwaysAsk, lastUsedPlayer] = await Promise.all([
      getDefaultPlayer(),
      getAlwaysAsk(),
      getLastUsedPlayer(),
    ]);

    return {
      defaultPlayer,
      alwaysAsk,
      lastUsedPlayer,
      shouldUseDefault: !alwaysAsk && defaultPlayer !== null,
    };
  } catch (error) {
    console.error('[PlayerPreferences] Error getting selection config:', error);
    return {
      defaultPlayer: null,
      alwaysAsk: true,
      lastUsedPlayer: null,
      shouldUseDefault: false,
    };
  }
}

/**
 * Reset to always ask for player selection
 * @returns {Promise<boolean>} Success status
 */
export async function resetToAlwaysAsk() {
  try {
    await setAlwaysAsk(true);
    return true;
  } catch (error) {
    console.error('[PlayerPreferences] Error resetting to always ask:', error);
    return false;
  }
}

export default {
  getDefaultPlayer,
  setDefaultPlayer,
  getAlwaysAsk,
  setAlwaysAsk,
  getLastUsedPlayer,
  setLastUsedPlayer,
  clearAllPreferences,
  handlePlayerSelection,
  getPlayerSelectionConfig,
  resetToAlwaysAsk,
  STORAGE_KEYS,
};
