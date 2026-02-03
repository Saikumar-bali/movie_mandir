import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import NeoWatercolorLoader from '../components/NeoWatercolorLoader';
import movieApi from '../api/movie_api';
import SDUIRenderer from '../components/sdui/SDUIRenderer';

// const IntroVideo = require('../loading_video/Ella_Iethe_dabbulu.mp4'); // Removed


const { width, height } = Dimensions.get('window');
const numColumns = 2;
const itemWidth = (width - 20) / numColumns;

const HomeScreen = ({ navigation }) => {
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [viewMode, setViewMode] = useState('online'); // online, offline
  const [contentType, setContentType] = useState('movies'); // movies, series
  const [showSecretChannel, setShowSecretChannel] = useState(false);
  const [logContent, setLogContent] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Refs to track initial load
  const hasShownIntro = useRef(false);
  // const videoRef = useRef(null); // Removed
  const initialFetchDone = useRef(false);

  // Initial load - show intro video only once
  useEffect(() => {
    if (!hasShownIntro.current) {
      // Show intro video first
      setInitialLoading(true);

      // Fetch initial content after intro
      const timer = setTimeout(() => {
        setInitialLoading(false);
        hasShownIntro.current = true;
        fetchContent();
      }, 6000);

      return () => clearTimeout(timer);
    } else {
      // If intro already shown, just fetch content
      fetchContent();
    }
  }, []);

  // Load content when switching between movies/series
  useEffect(() => {
    if (hasShownIntro.current && !initialFetchDone.current) {
      fetchContent();
      initialFetchDone.current = true;
    }
  }, [contentType]);

  // Debounce search to prevent API flooding
  useEffect(() => {
    if (viewMode === 'online' && searchQuery.trim() !== '') {
      const delayDebounceFn = setTimeout(() => {
        handleSearchContent(searchQuery);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else if (viewMode === 'offline') {
      // Filter offline content locally
      fetchOfflineContent(searchQuery);
    }
  }, [searchQuery, viewMode]);

  const fetchContent = async (query = '') => {
    if (viewMode !== 'online') return;

    // Note: The new API doesn't support search yet in this simple implementation
    // For now, we just fetch the list. Search would require iterating or finding a search endpoint.

    if (query === '') {
      setContentLoading(true);
    }

    try {
      if (contentType === 'movies') {
        await fetchMovies(query);
      } else {
        await fetchSeries(query);
      }
    } finally {
      if (query === '') {
        setTimeout(() => {
          setContentLoading(false);
        }, 500);
      }
    }
  };

  const fetchMovies = async (query = '') => {
    try {
      let data = [];
      if (query) {
        // Server Search
        data = await movieApi.search(query);
        setHasMore(false); // Disable pagination for search results
      } else {
        // Initial Load (Page 1)
        data = await movieApi.getMovies(1);
        setPage(1);
        setHasMore(true);
      }
      setMovies(data || []);
    } catch (error) {
      console.error('Error fetching movies:', error);
      Alert.alert('Error', 'Failed to load movies. Please check your connection.');
    }
  };

  const fetchSeries = async (query = '') => {
    try {
      let data = [];
      if (query) {
        // Server Search
        data = await movieApi.search(query);
        setHasMore(false);
      } else {
        // Initial Load (Page 1)
        data = await movieApi.getSeries(1);
        setPage(1);
        setHasMore(true);
      }
      setSeries(data || []);
    } catch (error) {
      console.error('Error fetching series:', error);
      Alert.alert('Error', 'Failed to load series. Please check your connection.');
    }
  };

  const loadMore = async () => {
    if (isFetchingMore || !hasMore || searchQuery !== '' || viewMode !== 'online') return;

    setIsFetchingMore(true);
    const nextPage = page + 1;
    console.log(`Loading page ${nextPage}`);

    try {
      if (contentType === 'movies') {
        const data = await movieApi.getMovies(nextPage);
        if (data && data.length > 0) {
          setMovies(prev => {
            // Filter duplicates
            const existingIds = new Set(prev.map(m => m.id));
            const newMovies = data.filter(m => !existingIds.has(m.id));
            return [...prev, ...newMovies];
          });
          setPage(nextPage);
        } else {
          setHasMore(false);
        }
      } else {
        const data = await movieApi.getSeries(nextPage);
        if (data && data.length > 0) {
          setSeries(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const newSeries = data.filter(s => !existingIds.has(s.id));
            return [...prev, ...newSeries];
          });
          setPage(nextPage);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Load more error:', error);
      setHasMore(false);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const fetchOfflineContent = async (query = '') => {
    try {
      const savedRaw = await AsyncStorage.getItem('downloadedMovies');
      const savedMovies = savedRaw ? JSON.parse(savedRaw) : [];

      // For series, we need to handle differently
      const seriesRaw = await AsyncStorage.getItem('downloadedSeries');
      const savedSeries = seriesRaw ? JSON.parse(seriesRaw) : {};

      if (contentType === 'movies') {
        if (query) {
          const filtered = savedMovies.filter(m =>
            m.title.toLowerCase().includes(query.toLowerCase())
          );
          setMovies(filtered);
        } else {
          setMovies(savedMovies);
        }
      } else {
        // For series offline view, we need to flatten episodes
        const allEpisodes = Object.values(savedSeries).flatMap(season => Object.values(season));
        if (query) {
          const filtered = allEpisodes.filter(ep =>
            ep.seriesName.toLowerCase().includes(query.toLowerCase()) ||
            ep.episodeName.toLowerCase().includes(query.toLowerCase())
          );
          setSeries(filtered);
        } else {
          setSeries(allEpisodes);
        }
      }
    } catch (e) {
      console.error('Error fetching offline content', e);
    }
  };

  const handleSearchContent = (query = '') => {
    setSearchLoading(true);
    fetchContent(query);
    setTimeout(() => {
      setSearchLoading(false);
    }, 1000);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const onSubmitSearch = () => {
    if (viewMode === 'online') {
      handleSearchContent(searchQuery);
    } else {
      fetchOfflineContent(searchQuery);
    }
  };

  const handleDeleteMovieDownload = async (movieData) => {
    Alert.alert(
      "Delete Download",
      "Are you sure you want to delete this movie?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (movieData.offlineUrl && await RNFS.exists(movieData.offlineUrl)) {
                await RNFS.unlink(movieData.offlineUrl);
              }

              const savedRaw = await AsyncStorage.getItem('downloadedMovies');
              if (savedRaw) {
                const savedMovies = JSON.parse(savedRaw);
                const filtered = savedMovies.filter(m => m.id !== movieData.id);
                await AsyncStorage.setItem('downloadedMovies', JSON.stringify(filtered));

                if (contentType === 'movies') {
                  setMovies(filtered);
                }
              }
            } catch (e) {
              console.error("Delete error", e);
              Alert.alert("Error", "Failed to delete movie");
            }
          }
        }
      ]
    );
  };

  const handleDeleteEpisodeDownload = async (episodeData) => {
    Alert.alert(
      "Delete Download",
      "Are you sure you want to delete this episode?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (episodeData.offlineUrl && await RNFS.exists(episodeData.offlineUrl)) {
                await RNFS.unlink(episodeData.offlineUrl);
              }

              const key = `downloadedSeries_${episodeData.seriesId}`;
              const savedRaw = await AsyncStorage.getItem(key);
              if (savedRaw) {
                const savedEpisodes = JSON.parse(savedRaw);
                delete savedEpisodes[episodeData.episodeId];
                await AsyncStorage.setItem(key, JSON.stringify(savedEpisodes));

                // Refresh the offline list
                fetchOfflineContent(searchQuery);
              }
            } catch (e) {
              console.error("Delete error", e);
              Alert.alert("Error", "Failed to delete episode");
            }
          }
        }
      ]
    );
  };

  const renderMovieItem = ({ item, index }) => {
    const isOffline = viewMode === 'offline';

    if (contentType === 'series' && isOffline) {
      // For series in offline mode, item is an episode
      return (
        <TouchableOpacity
          style={styles.movieItem}
          onPress={() => {
            navigation.navigate('Player', {
              videoUrl: item.offlineUrl,
              title: `${item.seriesName} - ${item.episodeName} (Offline)`
            });
          }}
        >
          <Image
            source={{ uri: item.stillPath || item.poster_path || 'https://via.placeholder.com/150' }}
            style={styles.poster}
          />
          <Text style={styles.title} numberOfLines={2}>
            {item.seriesName}
          </Text>
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {item.episodeName}
          </Text>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteEpisodeDownload(item)}
          >
            <Icon name="delete" size={20} color="#ff375f" />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.movieItem}
        onPress={() => {
          if (isOffline) {
            navigation.navigate('Player', {
              videoUrl: item.offlineUrl,
              title: item.title + " (Offline)"
            });
          } else {
            if (contentType === 'movies') {
              navigation.navigate('MovieDetail', { movie: item });
            } else {
              navigation.navigate('SeriesDetail', { series: item });
            }
          }
        }}
      >
        <Image
          source={{ uri: item.poster_path || 'https://via.placeholder.com/150' }}
          style={styles.poster}
        />

        {contentType === 'series' && (
          <View style={styles.seriesBadge}>
            <Icon name="tv" size={12} color="#fff" />
            <Text style={styles.seriesBadgeText}>
              {/* Note: List API often doesn't give full seasons list, default to null check */}
              {item.seasons?.length || '?'} S
            </Text>
          </View>
        )}

        <Text style={styles.title} numberOfLines={1}>
          {item.title || item.name}
        </Text>

        {contentType === 'series' && item.first_air_date && (
          <Text style={styles.yearText}>
            {item.first_air_date.split('-')[0]}
          </Text>
        )}

        {isOffline && contentType === 'movies' && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteMovieDownload(item)}
          >
            <Icon name="delete" size={20} color="#ff375f" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    if (hasShownIntro.current && viewMode === 'online') {
      fetchContent();
    }
  }, [contentType, viewMode]);

  // Handle loader animation end (replaced video end/error)
  const onLoaderAnimationEnd = () => {
    setInitialLoading(false);
    hasShownIntro.current = true;
    // Fetch content if not already fetched (though useEffect triggers it anyway on hasShownIntro change usually, but we want to be safe)
    if (!initialFetchDone.current) {
      fetchContent();
    }
  };

  const getCurrentData = () => {
    return contentType === 'movies' ? movies : series;
  };

  const getEmptyText = () => {
    if (viewMode === 'offline') {
      return contentType === 'movies'
        ? 'No downloaded movies found'
        : 'No downloaded episodes found';
    }
    return contentType === 'movies'
      ? 'No movies found'
      : 'No series found';
  };

  const getSearchPlaceholder = () => {
    if (viewMode === 'offline') {
      return contentType === 'movies'
        ? "Search downloaded movies..."
        : "Search downloaded episodes...";
    }
    return contentType === 'movies'
      ? "Search movies..."
      : "Search series...";
  };

  const getCurrentDataLength = () => {
    const data = getCurrentData();
    return Array.isArray(data) ? data.length : 0;
  };

  const handleContentTypeChange = (type) => {
    setContentType(type);
    setSearchQuery('');
    if (viewMode === 'online') {
      setContentLoading(true);
      if (type === 'movies') {
        fetchMovies('').finally(() => {
          setTimeout(() => setContentLoading(false), 500);
        });
      } else {
        fetchSeries('').finally(() => {
          setTimeout(() => setContentLoading(false), 500);
        });
      }
    } else {
      fetchOfflineContent('');
    }
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setSearchQuery('');
    if (mode === 'online') {
      setContentLoading(true);
      fetchContent().finally(() => {
        setTimeout(() => setContentLoading(false), 500);
      });
    } else {
      fetchOfflineContent('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Secret Channel Modal */}
      <Modal visible={showSecretChannel} animationType="slide" onRequestClose={() => setShowSecretChannel(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Secret Channel</Text>
            <TouchableOpacity onPress={() => setShowSecretChannel(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* SDUI Engine Mount Point */}
          <SDUIRenderer />

        </SafeAreaView>
      </Modal>

      {/* Initial Loading Intro Video (Only shows on first app launch) */}
      {/* Initial Loading Intro (Only shows on first app launch) */}
      {initialLoading && !hasShownIntro.current && (
        <NeoWatercolorLoader onAnimationEnd={onLoaderAnimationEnd} />
      )}

      {/* Content Loading Overlay (shows while waiting for backend data) */}
      {(contentLoading && !initialLoading) && (
        <View style={styles.contentLoadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#ff375f" />
            <Text style={styles.loadingText}>
              {contentType === 'movies' ? 'Loading Movies...' : 'Loading Series...'}
            </Text>
          </View>
        </View>
      )}

      {/* Search Loading Indicator (shows during searches, no video) */}
      {searchLoading && (
        <View style={styles.searchLoadingOverlay}>
          <ActivityIndicator size="large" color="#ff375f" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {/* Main Content */}
      {(!initialLoading || hasShownIntro.current) && (
        <>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <TouchableOpacity onLongPress={() => setShowSecretChannel(true)}>
                <Text style={styles.headerTitle}>
                  {viewMode === 'online'
                    ? (contentType === 'movies' ? 'Movies' : 'Series')
                    : (contentType === 'movies' ? 'Downloads' : 'Episodes')
                  }
                </Text>
              </TouchableOpacity>

              <View style={styles.contentTypeToggle}>
                <TouchableOpacity
                  style={[
                    styles.contentTypeButton,
                    contentType === 'movies' && styles.contentTypeButtonActive
                  ]}
                  onPress={() => handleContentTypeChange('movies')}
                >
                  <Text style={styles.contentTypeButtonText}>Movies</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.contentTypeButton,
                    contentType === 'series' && styles.contentTypeButtonActive
                  ]}
                  onPress={() => handleContentTypeChange('series')}
                >
                  <Text style={styles.contentTypeButtonText}>Series</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === 'online' && styles.toggleButtonActive
                ]}
                onPress={() => handleViewModeChange('online')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  viewMode === 'online' && styles.toggleButtonActiveText
                ]}>
                  Online
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  viewMode === 'offline' && styles.toggleButtonActive
                ]}
                onPress={() => handleViewModeChange('offline')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  viewMode === 'offline' && styles.toggleButtonActiveText
                ]}>
                  Offline
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChangeText={handleSearch}
              onSubmitEditing={onSubmitSearch}
              returnKeyType="search"
            />
          </View>

          {/* Content Grid */}
          {!contentLoading && (
            <FlatList
              data={getCurrentData()}
              onEndReached={loadMore}
              onEndReachedThreshold={4} // Load 4 screens ahead for smooth infinite feel
              renderItem={renderMovieItem}
              keyExtractor={(item, index) => `${item.id}_${viewMode}_${index}`} // Unique key combo
              numColumns={numColumns}
              contentContainerStyle={[
                styles.movieList,
                getCurrentDataLength() === 0 && styles.emptyList
              ]}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon
                    name={contentType === 'movies' ? 'movie' : 'tv'}
                    size={60}
                    color="#ccc"
                  />
                  <Text style={styles.emptyText}>
                    {getEmptyText()}
                  </Text>
                  {viewMode === 'online' && (
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => {
                        setContentLoading(true);
                        fetchContent().finally(() => {
                          setTimeout(() => setContentLoading(false), 500);
                        });
                      }}
                    >
                      <Icon name="refresh" size={20} color="#fff" />
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
              ListFooterComponent={
                isFetchingMore ? (
                  <View style={{ paddingVertical: 20 }}>
                    <ActivityIndicator size="small" color="#ff375f" />
                  </View>
                ) : <View style={{ height: 20 }} />
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // loadingOverlay: {
  //   ...StyleSheet.absoluteFillObject,
  //   backgroundColor: '#000',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   zIndex: 999,
  // },
  contentLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 998,
  },
  searchLoadingOverlay: {
    position: 'absolute',
    top: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 997,
    backgroundColor: 'transparent',
  },
  loadingBox: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 250,
  },
  // introVideo: {
  //   position: 'absolute',
  //   top: 0,
  //   left: 0,
  //   bottom: 0,
  //   right: 0,
  //   backgroundColor: '#000',
  // },
  // loadingIndicatorWrapper: {
  //   position: 'absolute',
  //   bottom: 50,
  //   alignItems: 'center',
  // },
  loadingText: {
    color: '#000',
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingSubText: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  header: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  contentTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 2,
  },
  contentTypeButton: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 6,
  },
  contentTypeButtonActive: {
    backgroundColor: '#ff375f',
  },
  contentTypeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 2,
    marginBottom: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#333',
  },
  toggleButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 14,
  },
  toggleButtonActiveText: {
    color: '#fff',
  },
  searchInput: {
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  movieList: {
    padding: 5,
    flexGrow: 1,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  movieItem: {
    width: itemWidth,
    margin: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    paddingBottom: 10,
  },
  poster: {
    width: '100%',
    height: 220,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 8,
    marginTop: 8,
    color: '#000',
  },
  episodeTitle: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
    marginTop: 2,
  },
  yearText: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
    marginTop: 2,
  },
  seriesBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  seriesBadgeText: {
    color: '#fff',
    fontSize: 10,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  deleteButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 15,
    padding: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff375f',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logText: {
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  clearLogsButton: {
    backgroundColor: '#333',
    padding: 15,
    alignItems: 'center',
  },
});

export default HomeScreen;