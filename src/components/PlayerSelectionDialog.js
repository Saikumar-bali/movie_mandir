import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  EXTERNAL_PLAYERS,
  getPlayerStatus,
  installPlayer,
} from '../services/ExternalPlayerService';
import {
  getDefaultPlayer,
  setDefaultPlayer,
  getAlwaysAsk,
  setAlwaysAsk,
} from '../services/PlayerPreferences';

/**
 * Player Selection Dialog Component
 * Shows available players and allows user to select one
 */
const PlayerSelectionDialog = ({
  visible,
  onClose,
  onSelect,
  videoTitle = '',
}) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [defaultPlayer, setDefaultPlayerState] = useState(null);
  const [alwaysAsk, setAlwaysAskState] = useState(true);
  const [rememberChoice, setRememberChoice] = useState(false);

  // Load player status and preferences
  useEffect(() => {
    loadPlayersAndPreferences();
  }, []);

  const loadPlayersAndPreferences = async () => {
    try {
      setLoading(true);

      // Load preferences
      const [savedDefaultPlayer, savedAlwaysAsk] = await Promise.all([
        getDefaultPlayer(),
        getAlwaysAsk(),
      ]);

      setDefaultPlayerState(savedDefaultPlayer);
      setAlwaysAskState(savedAlwaysAsk);

      // Load player status
      const playersWithStatus = await Promise.all(
        EXTERNAL_PLAYERS.map(async (player) => {
          const status = await getPlayerStatus(player.id);
          return {
            ...player,
            ...status,
          };
        })
      );

      setPlayers(playersWithStatus);
    } catch (error) {
      console.error('[PlayerSelectionDialog] Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelect = async (player) => {
    // Save preference if user chose to remember
    if (rememberChoice) {
      await setDefaultPlayer(player.id);
      await setAlwaysAsk(false);
    }

    // Notify parent of selection
    onSelect(player);
    onClose();
  };

  const handleInstallPlayer = async (player) => {
    try {
      await installPlayer(player.id);
      
      // Refresh player list after install attempt
      setTimeout(() => {
        loadPlayersAndPreferences();
      }, 2000);
    } catch (error) {
      console.error('[PlayerSelectionDialog] Install error:', error);
    }
  };

  const handleCancel = () => {
    setRememberChoice(false);
    onClose();
  };

  const renderPlayerItem = (player) => {
    const isDefault = defaultPlayer === player.id;
    const isExternal = player.isExternal;

    return (
      <TouchableOpacity
        key={player.id}
        style={[
          styles.playerItem,
          isDefault && styles.defaultPlayerItem,
        ]}
        onPress={() => handlePlayerSelect(player)}
        activeOpacity={0.7}
      >
        <View style={[styles.playerIconContainer, { backgroundColor: player.color + '20' }]}>
          <Icon
            name={player.icon}
            size={28}
            color={player.color}
          />
        </View>

        <View style={styles.playerInfo}>
          <Text style={[
            styles.playerName,
            isDefault && styles.defaultPlayerText,
          ]}>
            {player.name}
          </Text>
          <Text style={styles.playerDescription}>
            {player.description}
          </Text>
          {isDefault && (
            <Text style={styles.defaultBadge}>
              Default
            </Text>
          )}
        </View>

        <View style={styles.playerAction}>
          <Icon
            name={isDefault ? 'check-circle' : 'chevron-right'}
            size={24}
            color={isDefault ? '#00b894' : '#888'}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Choose Player</Text>
              <Text style={styles.subtitle}>
                {videoTitle || 'Select a player to continue'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Icon name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Player List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ff375f" />
              <Text style={styles.loadingText}>Loading players...</Text>
            </View>
          ) : (
            <View style={styles.playersList}>
              {players.map(renderPlayerItem)}
            </View>
          )}

          {/* Remember Choice Option */}
          {!loading && (
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.rememberOption}
                onPress={() => setRememberChoice(!rememberChoice)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  rememberChoice && styles.checkboxChecked,
                ]}>
                  {rememberChoice && (
                    <Icon name="check" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.rememberText}>
                  Remember this choice
                </Text>
              </TouchableOpacity>

              {alwaysAsk && (
                <Text style={styles.hintText}>
                  You can change this in settings
                </Text>
              )}
            </View>
          )}

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 16,
  },
  playersList: {
    padding: 16,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252540',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  defaultPlayerItem: {
    borderWidth: 2,
    borderColor: '#00b894',
  },
  uninstalledItem: {
    opacity: 0.6,
  },
  playerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  defaultPlayerText: {
    color: '#00b894',
  },
  playerDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  notInstalledText: {
    fontSize: 12,
    color: '#ff375f',
    marginTop: 4,
  },
  defaultBadge: {
    fontSize: 11,
    color: '#00b894',
    marginTop: 4,
    fontWeight: '600',
  },
  playerAction: {
    alignItems: 'flex-end',
  },
  installButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff375f20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  installButtonText: {
    color: '#ff375f',
    fontSize: 13,
    fontWeight: '600',
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  rememberOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#ff375f',
    borderColor: '#ff375f',
  },
  rememberText: {
    fontSize: 15,
    color: '#ccc',
  },
  hintText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  cancelButton: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: '#333',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PlayerSelectionDialog;
