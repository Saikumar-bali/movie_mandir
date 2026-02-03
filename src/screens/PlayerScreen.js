import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Text,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  Alert,
  BackHandler,
  Platform,
  FlatList
} from 'react-native';
import Video from 'react-native-video'; // Switched to react-native-video
import Icon from 'react-native-vector-icons/MaterialIcons';
import Orientation from 'react-native-orientation-locker';
import Slider from '@react-native-community/slider';
import NetInfo from '@react-native-community/netinfo';

const { width, height } = Dimensions.get('window');

const PlayerScreen = ({ route, navigation }) => {
  const { videoUrl, title, isLiveStream = false } = route.params || {};
  const videoRef = useRef(null); // Renamed from vlcRef
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const [volume, setVolume] = useState(100); // UI uses 0-100, Player uses 0-1
  const [showSettings, setShowSettings] = useState(false);
  const [locked, setLocked] = useState(false);
  
  // Audio tracks and subtitles
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1); // -1 usually means default or auto
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1); // -1 means disabled
  const [showAudioTrackSelector, setShowAudioTrackSelector] = useState(false);
  const [showSubtitleSelector, setShowSubtitleSelector] = useState(false);
  const [availableAudioTracks, setAvailableAudioTracks] = useState([]);
  const [availableSubtitleTracks, setAvailableSubtitleTracks] = useState([]);

  const controlsTimeout = useRef(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const lockButtonOpacity = useRef(new Animated.Value(1)).current;

  // Language Code Map
  const languageMap = {
    'tel': 'Telugu',
    'tam': 'Tamil',
    'eng': 'English',
    'hin': 'Hindi',
    'kan': 'Kannada',
    'mal': 'Malayalam',
    'mar': 'Marathi',
    'ben': 'Bengali',
    'guj': 'Gujarati',
    'pan': 'Punjabi',
    'spa': 'Spanish',
    'fra': 'French',
    'deu': 'German',
    'jpn': 'Japanese',
    'kor': 'Korean',
    'zho': 'Chinese',
    'rus': 'Russian'
  };

  // Network monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (!state.isConnected) {
        setError('No internet connection');
        setPaused(true);
      } else if (error === 'No internet connection') {
        setError(null);
        setTimeout(() => {
          setPaused(false);
        }, 1000);
      }
    });

    return () => unsubscribe();
  }, [error]);

  // Initialize orientation and status bar
  useEffect(() => {
    Orientation.lockToLandscape();
    StatusBar.setHidden(true);

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFullscreen) {
        handleFullscreen();
        return true;
      }
      return false;
    });

    return () => {
      Orientation.lockToPortrait();
      StatusBar.setHidden(false);
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      backHandler.remove();
    };
  }, [isFullscreen]);

  // Handle Video Load (Get tracks here)
  const handleOnLoad = (data) => {
    setLoading(false);
    setBuffering(false);
    setDuration(data.duration);
    setError(null);

    // Parse Audio Tracks
    if (data.audioTracks) {
        const formattedAudio = data.audioTracks.map((track, index) => {
            const langCode = (track.language || '').toLowerCase();
            let readableName = track.title || '';
            
            if (!readableName && languageMap[langCode]) {
                readableName = languageMap[langCode];
            }
            if (!readableName) {
                readableName = `Audio ${index + 1}`;
            }

            return {
                id: index, // react-native-video uses index
                name: readableName,
                language: track.language,
                type: 'audio'
            };
        });
        
        // Remove duplicates if any (though usually unique by index)
        setAvailableAudioTracks(formattedAudio);
        
        // Set default if available and not set
        if (currentAudioTrack === -1 && formattedAudio.length > 0) {
             // Let the player decide default usually, but we can set to 0 if needed
             // setCurrentAudioTrack(0); 
        }
    }

    // Parse Text Tracks
    if (data.textTracks) {
        const formattedSubs = data.textTracks.map((track, index) => {
             const langCode = (track.language || '').toLowerCase();
             let readableName = track.title || '';

             if (!readableName && languageMap[langCode]) {
                readableName = languageMap[langCode];
             }
             if (!readableName) {
                readableName = `Subtitle ${index + 1}`;
             }

             return {
                 id: index,
                 name: readableName,
                 language: track.language,
                 type: 'subtitle'
             };
        });
        setAvailableSubtitleTracks(formattedSubs);
    }
  };

  const handleOnProgress = (data) => {
    if (!isSeeking) {
      setCurrentTime(data.currentTime);
    }
  };

  const handleOnBuffer = ({ isBuffering }) => {
    setBuffering(isBuffering);
  };

  const handleOnError = (e) => {
    console.log('Video Error:', e);
    setLoading(false);
    setBuffering(false);
    setError(e.error?.localizedFailureReason || 'Failed to load video stream');
  };

  const handleOnEnded = () => {
    if (isLiveStream) {
       // Live stream ended or interrupted
       setPaused(true);
    } else {
      setPaused(true);
      setShowControls(true);
      controlsOpacity.setValue(1);
    }
  };

  // Select audio track
  const selectAudioTrack = (index) => {
    setCurrentAudioTrack(index);
    setShowAudioTrackSelector(false);
    startControlsTimer();
  };

  // Select subtitle track
  const selectSubtitleTrack = (index) => {
    setCurrentSubtitleTrack(index);
    setShowSubtitleSelector(false);
    startControlsTimer();
  };

  const handlePlayPause = () => {
    if (error) {
      handleRetry();
      return;
    }
    setPaused(!paused);
    startControlsTimer();
  };

  const handleSeek = (value) => {
    if (videoRef.current) {
      setIsSeeking(true);
      videoRef.current.seek(value); // react-native-video seeks in seconds
      setCurrentTime(value);
      setTimeout(() => setIsSeeking(false), 500);
    }
    startControlsTimer();
  };

  const handleForward = () => {
    if (isLiveStream) return;
    const newTime = Math.min(currentTime + 10, duration);
    if (videoRef.current) {
        handleSeek(newTime);
    }
  };

  const handleBackward = () => {
    if (isLiveStream) return;
    const newTime = Math.max(currentTime - 10, 0);
    if (videoRef.current) {
        handleSeek(newTime);
    }
  };

  const handleFullscreen = () => {
    if (isFullscreen) {
      Orientation.lockToPortrait();
      setIsFullscreen(false);
      StatusBar.setHidden(false);
    } else {
      Orientation.lockToLandscape();
      setIsFullscreen(true);
      StatusBar.setHidden(true);
    }
    startControlsTimer();
  };

  const handleBack = () => {
    Orientation.lockToPortrait();
    StatusBar.setHidden(false);
    navigation.goBack();
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setBuffering(true);
    // Force re-render via key or just let it try to reconnect?
    // Often setting paused true then false helps
    setPaused(true);
    setTimeout(() => {
        setPaused(false);
    }, 500);
  };

  const formatTime = (seconds) => {
    if (isLiveStream) return 'LIVE';
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
    startControlsTimer();
  };

  const changeVolume = (value) => {
    setVolume(value);
  };

  const startControlsTimer = () => {
    if (!showControls) {
      Animated.timing(controlsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(lockButtonOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setShowControls(true);
    }

    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }

    controlsTimeout.current = setTimeout(() => {
      if (!paused && !showSettings && !error && !locked) {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowControls(false);
        });
        Animated.timing(lockButtonOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }, 3000);
  };

  const handleScreenTouch = () => {
    if (locked) {
      if (lockButtonOpacity._value > 0) {
        Animated.timing(lockButtonOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.timing(lockButtonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => {
          Animated.timing(lockButtonOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 3000);
      }
    } else {
      if (showControls) {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowControls(false);
        });
        Animated.timing(lockButtonOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      } else {
        Animated.timing(controlsOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        Animated.timing(lockButtonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        setShowControls(true);
        startControlsTimer();
      }
    }
  };

  const handleLockPress = () => {
    const newLocked = !locked;
    setLocked(newLocked);

    if (newLocked) {
      Animated.timing(lockButtonOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      if (showControls) {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setShowControls(false);
        });
      }
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      controlsTimeout.current = setTimeout(() => {
        Animated.timing(lockButtonOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 3000);
    } else {
      Animated.timing(controlsOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      Animated.timing(lockButtonOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setShowControls(true);
      startControlsTimer();
    }
  };

  // Render audio track selector
  const renderAudioTrackSelector = () => (
    <Modal
      visible={showAudioTrackSelector}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowAudioTrackSelector(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>Select Audio Language</Text>
          
          <FlatList
            data={availableAudioTracks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.trackItem,
                  currentAudioTrack === item.id && styles.selectedTrackItem
                ]}
                onPress={() => selectAudioTrack(item.id)}
              >
                <View style={styles.trackItemContent}>
                  <Icon 
                    name="audiotrack" 
                    size={20} 
                    color={currentAudioTrack === item.id ? "#ff375f" : "#fff"} 
                  />
                  <Text style={[
                    styles.trackText,
                    currentAudioTrack === item.id && styles.selectedTrackText
                  ]}>
                    {item.name}
                  </Text>
                  {currentAudioTrack === item.id && (
                    <Icon name="check-circle" size={20} color="#ff375f" />
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.noTracksContainer}>
                <Icon name="warning" size={40} color="#888" />
                <Text style={styles.noTracksText}>No alternative audio found</Text>
                <Text style={styles.noTracksSubText}>
                  Default audio is playing
                </Text>
              </View>
            }
          />

          <TouchableOpacity
            style={styles.selectorCloseButton}
            onPress={() => setShowAudioTrackSelector(false)}
          >
            <Text style={styles.selectorCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Render subtitle selector
  const renderSubtitleSelector = () => (
    <Modal
      visible={showSubtitleSelector}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSubtitleSelector(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorTitle}>Select Subtitle</Text>
          
          <TouchableOpacity
            style={[
              styles.trackItem,
              currentSubtitleTrack === -1 && styles.selectedTrackItem
            ]}
            onPress={() => selectSubtitleTrack(-1)}
          >
            <View style={styles.trackItemContent}>
              <Icon name="subtitles-off" size={20} color="#fff" />
              <Text style={styles.trackText}>
                Subtitles Off {currentSubtitleTrack === -1 && ' ✓'}
              </Text>
            </View>
          </TouchableOpacity>

          <FlatList
            data={availableSubtitleTracks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.trackItem,
                  currentSubtitleTrack === item.id && styles.selectedTrackItem
                ]}
                onPress={() => selectSubtitleTrack(item.id)}
              >
                <View style={styles.trackItemContent}>
                  <Icon 
                    name="subtitles" 
                    size={20} 
                    color={currentSubtitleTrack === item.id ? "#ff375f" : "#fff"} 
                  />
                  <Text style={[
                    styles.trackText,
                    currentSubtitleTrack === item.id && styles.selectedTrackText
                  ]}>
                    {item.name}
                  </Text>
                  {currentSubtitleTrack === item.id && (
                    <Icon name="check-circle" size={20} color="#ff375f" />
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.noTracksContainer}>
                <Icon name="warning" size={40} color="#888" />
                <Text style={styles.noTracksText}>No subtitles available</Text>
              </View>
            }
          />

          <TouchableOpacity
            style={styles.selectorCloseButton}
            onPress={() => setShowSubtitleSelector(false)}
          >
            <Text style={styles.selectorCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderErrorOverlay = () => {
    if (!error) return null;
    return (
      <View style={styles.errorOverlay}>
        <Icon name="error-outline" size={60} color="#ff375f" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Icon name="refresh" size={24} color="#fff" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderBufferingOverlay = () => {
    if (!buffering || error) return null;
    return (
      <View style={styles.bufferingOverlay}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.bufferingText}>Buffering...</Text>
      </View>
    );
  };

  const renderSettingsModal = () => (
    <Modal
      visible={showSettings}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSettings(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.settingsContainer}>
          <Text style={styles.settingsTitle}>Player Settings</Text>
          <ScrollView style={styles.settingsScroll}>
            {/* Audio Track Section */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>Audio Track</Text>
              <TouchableOpacity
                style={styles.settingOption}
                onPress={() => {
                  setShowSettings(false);
                  setTimeout(() => setShowAudioTrackSelector(true), 300);
                }}
              >
                <View style={styles.settingOptionContent}>
                  <Icon name="audiotrack" size={24} color="#ff375f" />
                  <Text style={styles.optionText}>
                    {availableAudioTracks.find(t => t.id === currentAudioTrack)?.name || 'Default / No Selection'}
                  </Text>
                </View>
                <Icon name="arrow-forward-ios" size={20} color="#888" />
              </TouchableOpacity>
              <Text style={styles.settingInfo}>
                Detected Tracks: {availableAudioTracks.length}
              </Text>
            </View>

            {/* Subtitle Section */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>Subtitles</Text>
              <TouchableOpacity
                style={styles.settingOption}
                onPress={() => {
                  setShowSettings(false);
                  setTimeout(() => setShowSubtitleSelector(true), 300);
                }}
              >
                <View style={styles.settingOptionContent}>
                  <Icon 
                    name={currentSubtitleTrack === -1 ? "subtitles-off" : "subtitles"} 
                    size={24} 
                    color={currentSubtitleTrack === -1 ? "#888" : "#ff375f"} 
                  />
                  <Text style={styles.optionText}>
                    {currentSubtitleTrack === -1 
                      ? 'Subtitles Disabled' 
                      : availableSubtitleTracks.find(t => t.id === currentSubtitleTrack)?.name || 'Unknown'}
                  </Text>
                </View>
                <Icon name="arrow-forward-ios" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Volume Section */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>Volume</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>{volume}%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={volume}
                  onSlidingComplete={changeVolume}
                  minimumTrackTintColor="#ff375f"
                  maximumTrackTintColor="#333"
                  thumbTintColor="#ff375f"
                />
              </View>
            </View>

            {/* Current Stream Info Section */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>Current Stream Info</Text>
              <View style={styles.streamInfo}>
                <Text style={styles.streamInfoText}>URL: {videoUrl?.substring(0, 40)}...</Text>
                <Text style={styles.streamInfoText}>Engine: React Native Video</Text>
                <Text style={styles.streamInfoText}>Audio Tracks: {availableAudioTracks.length}</Text>
                <Text style={styles.streamInfoText}>Subtitle Tracks: {availableSubtitleTracks.length}</Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowSettings(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode="contain"
          paused={paused}
          rate={playbackRate}
          volume={volume / 100} // Convert 0-100 to 0.0-1.0
          onLoad={handleOnLoad}
          onProgress={handleOnProgress}
          onBuffer={handleOnBuffer}
          onError={handleOnError}
          onEnd={handleOnEnded}
          // Selected Audio Track logic for react-native-video
          selectedAudioTrack={
            currentAudioTrack !== -1 
              ? { type: 'index', value: currentAudioTrack }
              : undefined
          }
          // Selected Text Track logic
          selectedTextTrack={
             currentSubtitleTrack !== -1
              ? { type: 'index', value: currentSubtitleTrack }
              : { type: 'disabled' }
          }
          bufferConfig={{
            minBufferMs: 15000,
            maxBufferMs: 50000,
            bufferForPlaybackMs: 2500,
            bufferForPlaybackAfterRebufferMs: 5000
          }}
        />

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {renderBufferingOverlay()}
        {renderErrorOverlay()}
      </View>

      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleScreenTouch}
        disabled={!!error || loading}
      />

      <Animated.View
        style={[
          styles.lockButtonOverlay,
          { opacity: lockButtonOpacity }
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={handleLockPress}
          style={[
            styles.lockButton,
            locked && styles.lockButtonLocked
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            name={locked ? "lock" : "lock-open"}
            size={24}
            color={locked ? "#ff375f" : "#fff"}
          />
        </TouchableOpacity>
      </Animated.View>

      {!locked && (
        <Animated.View
          style={[
            styles.controlsOverlay,
            { opacity: controlsOpacity }
          ]}
          pointerEvents={showControls ? 'box-none' : 'none'}
        >
          <View style={styles.topControls}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-back" size={28} color="#fff" />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.videoTitle} numberOfLines={1}>
                {title || "Stream Player"}
              </Text>
              
              <View style={styles.trackIndicators}>
                {availableAudioTracks.length > 0 && (
                  <TouchableOpacity 
                    style={styles.trackIndicator}
                    onPress={() => setShowAudioTrackSelector(true)}
                  >
                    <Icon name="audiotrack" size={14} color="#fff" />
                    <Text style={styles.trackIndicatorText}>
                      {availableAudioTracks.find(t => t.id === currentAudioTrack)?.name || 'Default'}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {availableSubtitleTracks.length > 0 && (
                  <TouchableOpacity 
                    style={styles.trackIndicator}
                    onPress={() => setShowSubtitleSelector(true)}
                  >
                    <Icon 
                      name={currentSubtitleTrack === -1 ? "subtitles-off" : "subtitles"} 
                      size={14} 
                      color={currentSubtitleTrack === -1 ? "#888" : "#fff"} 
                    />
                    <Text style={[
                      styles.trackIndicatorText,
                      currentSubtitleTrack === -1 && { color: '#888' }
                    ]}>
                      {currentSubtitleTrack === -1 ? 'OFF' : 'ON'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.topRightControls}>
              {!isConnected && (
                <Icon name="signal-wifi-off" size={20} color="#ff6b6b" style={styles.connectionIcon} />
              )}

              {availableAudioTracks.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowAudioTrackSelector(true)}
                  style={styles.audioButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="audiotrack" size={20} color="#fff" />
                  {availableAudioTracks.length > 1 && (
                    <View style={styles.trackBadge}>
                      <Text style={styles.trackBadgeText}>{availableAudioTracks.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {availableSubtitleTracks.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowSubtitleSelector(true)}
                  style={styles.subtitleButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon 
                    name={currentSubtitleTrack === -1 ? "subtitles-off" : "subtitles"} 
                    size={20} 
                    color={currentSubtitleTrack === -1 ? "#888" : "#fff"} 
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setShowSettings(true)}
                style={styles.settingsButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="tune" size={24} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={changePlaybackRate}
                style={styles.rateButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.rateText}>{playbackRate}x</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleFullscreen}
                style={styles.fullscreenButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon
                  name={isFullscreen ? "fullscreen-exit" : "fullscreen"}
                  size={28}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>

          {!isLiveStream && (
            <View style={styles.centerControls}>
              <TouchableOpacity
                style={styles.seekButton}
                onPress={handleBackward}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Icon name="replay-10" size={40} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playButton}
                onPress={handlePlayPause}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Icon
                  name={paused ? "play-circle-filled" : "pause-circle-filled"}
                  size={70}
                  color="rgba(255,255,255,0.9)"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.seekButton}
                onPress={handleForward}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Icon name="forward-10" size={40} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomControls}>
            <TouchableOpacity
              onPress={handlePlayPause}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name={paused ? "play-arrow" : "pause"}
                size={28}
                color="#fff"
              />
            </TouchableOpacity>

            <Text style={styles.timeText}>
              {formatTime(currentTime)}
            </Text>

            {!isLiveStream && (
              <>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={duration}
                  value={currentTime}
                  onSlidingStart={() => {
                    setIsSeeking(true);
                    if (controlsTimeout.current) {
                      clearTimeout(controlsTimeout.current);
                    }
                  }}
                  onSlidingComplete={(value) => {
                    setIsSeeking(false);
                    handleSeek(value);
                  }}
                  onValueChange={(value) => {
                    setCurrentTime(value);
                  }}
                  minimumTrackTintColor="#ff375f"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#ff375f"
                  thumbSize={20}
                />
              </>
            )}

            <Text style={styles.timeText}>
              {isLiveStream ? 'LIVE' : formatTime(duration)}
            </Text>

            <TouchableOpacity
              onPress={handleFullscreen}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name={isFullscreen ? "fullscreen-exit" : "fullscreen"}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {!locked && !showControls && !isLiveStream && (
        <View style={styles.bottomSeekBar}>
          <View
            style={[
              styles.seekProgress,
              {
                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
                backgroundColor: '#ff375f'
              }
            ]}
          />
        </View>
      )}

      {renderSettingsModal()}
      {renderAudioTrackSelector()}
      {renderSubtitleSelector()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 10,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  loadingSubText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 5,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 9,
  },
  bufferingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  bufferProgressText: {
    color: '#aaa',
    marginTop: 5,
    fontSize: 14,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.95)',
    zIndex: 11,
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  errorButtons: {
    alignItems: 'center',
    marginTop: 10,
    width: '80%',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff375f',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginVertical: 5,
    width: '100%',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 2,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingBottom: 10,
    paddingTop: 20,
  },
  backButton: {
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginHorizontal: 15,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  trackIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  trackIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 5,
  },
  trackIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 3,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIcon: {
    marginRight: 10,
  },
  audioButton: {
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  trackBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff375f',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  subtitleButton: {
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  settingsButton: {
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rateButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 10,
    minWidth: 50,
    alignItems: 'center',
  },
  rateText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fullscreenButton: {
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  seekButton: {
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 30,
    marginHorizontal: 30,
  },
  playButton: {
    marginHorizontal: 30,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingTop: 15,
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
    minWidth: 45,
    textAlign: 'center',
    fontWeight: '500',
    marginHorizontal: 5,
  },
  slider: {
    flex: 1,
    height: 30,
    marginHorizontal: 10,
    position: 'relative',
  },
  bufferTrack: {
    position: 'absolute',
    left: 10,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    top: 14,
  },
  bottomSeekBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    zIndex: 3,
  },
  seekProgress: {
    height: '100%',
    backgroundColor: '#ff375f',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settingsContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    overflow: 'hidden',
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#2a2a2a',
  },
  settingsScroll: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  settingSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  settingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 10,
  },
  settingOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingInfo: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  sliderContainer: {
    marginVertical: 10,
  },
  sliderValue: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  streamInfo: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
    borderRadius: 8,
  },
  streamInfoText: {
    color: '#aaa',
    fontSize: 12,
    marginVertical: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  applyButton: {
    backgroundColor: '#ff375f',
    padding: 15,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#333',
    padding: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  lockButtonOverlay: {
    position: 'absolute',
    top: '50%',
    right: 20,
    transform: [{ translateY: -25 }],
    zIndex: 9999,
  },
  lockButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  lockButtonLocked: {
    backgroundColor: 'rgba(255,55,95,0.2)',
    borderColor: '#ff375f',
  },
  selectorContainer: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    overflow: 'hidden',
  },
  selectorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#2a2a2a',
  },
  trackItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  trackItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedTrackItem: {
    backgroundColor: 'rgba(255, 55, 95, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#ff375f',
  },
  trackText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  selectedTrackText: {
    color: '#ff375f',
    fontWeight: 'bold',
  },
  noTracksContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noTracksText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  noTracksSubText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  selectorCloseButton: {
    backgroundColor: '#333',
    padding: 15,
    alignItems: 'center',
  },
  selectorCloseButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default PlayerScreen;