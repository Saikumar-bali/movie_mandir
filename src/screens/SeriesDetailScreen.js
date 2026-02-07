import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  FlatList,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BackHandler } from 'react-native';
import movieApi from '../api/movie_api';

const { width } = Dimensions.get('window');

const SeriesDetailScreen = ({ route, navigation }) => {
  // Use local state for series to allow updates
  const [series, setSeries] = useState(route.params.series);
  const [loading, setLoading] = useState(false);

  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState({});
  const [watchProgress, setWatchProgress] = useState({});
  const [downloadingEpisodes, setDownloadingEpisodes] = useState({});

  useEffect(() => {
    loadFullDetails();
    checkDownloads();
    loadWatchProgress();
  }, []);

  const loadFullDetails = async () => {
    // If we don't have seasons or they are empty, we likely need to fetch details
    if (!series.seasons || series.seasons.length === 0) {
      console.log("Fetching full details for series:", series.id);
      setLoading(true);
      try {
        const fullDetails = await movieApi.getSeriesDetail(series.id);
        if (fullDetails) {
          setSeries(prev => ({ ...prev, ...fullDetails }));
          // Update checks with new data
          checkDownloads(fullDetails);
        }
      } catch (error) {
        console.error("Error fetching series details:", error);
        Alert.alert("Error", "Failed to load series details.");
      } finally {
        setLoading(false);
      }
    }
  };

  const getLocalPath = (url) => {
    if (!url) return '';
    const filename = url.split('/').pop();
    return `${RNFS.DocumentDirectoryPath}/${filename}`;
  };

  const checkDownloads = async (seriesData = series) => {
    const status = {};

    // Check all episodes in all seasons
    seriesData.seasons?.forEach(season => {
      season.episodes?.forEach(episode => {
        const source = episode.downloads?.[0] || episode.videos?.[0];
        if (source) {
          const path = getLocalPath(source.link);
          RNFS.exists(path).then(exists => {
            status[episode.id] = { isDownloaded: exists, progress: 0 };
            setDownloadStatus(prev => ({ ...prev, ...status }));
          });
        }
      });
    });
  };

  const loadWatchProgress = async () => {
    try {
      const progress = await AsyncStorage.getItem(`watchProgress_${series.id}`);
      if (progress) setWatchProgress(JSON.parse(progress));
    } catch (e) {
      console.error('Error loading progress:', e);
    }
  };

  const saveWatchProgress = async (episodeId) => {
    const newProgress = { ...watchProgress, [episodeId]: true };
    setWatchProgress(newProgress);
    await AsyncStorage.setItem(`watchProgress_${series.id}`, JSON.stringify(newProgress));
  };

  const calculateSeasonProgress = (season) => {
    if (!season.episodes || season.episodes.length === 0) return 0;
    const watchedEpisodes = season.episodes.filter(ep => watchProgress[ep.id]);
    return (watchedEpisodes.length / season.episodes.length) * 100;
  };

  const saveDownloadedEpisode = async (seriesData, season, episode, downloadUrl, localPath) => {
    try {
      const key = `downloadedSeries_${seriesData.id}`;
      const savedRaw = await AsyncStorage.getItem(key);
      const savedEpisodes = savedRaw ? JSON.parse(savedRaw) : {};

      // Create episode entry
      savedEpisodes[episode.id] = {
        seriesId: seriesData.id,
        seriesName: seriesData.name,
        seasonId: season.id,
        seasonNumber: season.season_number,
        episodeId: episode.id,
        episodeNumber: episode.episode_number,
        episodeName: episode.name,
        offlineUrl: localPath,
        downloadDate: new Date().toISOString(),
        stillPath: episode.still_path,
        poster_path: seriesData.poster_path
      };

      await AsyncStorage.setItem(key, JSON.stringify(savedEpisodes));
    } catch (e) {
      console.error('Failed to save episode download', e);
    }
  };

  const removeDownloadedEpisode = async (episodeId) => {
    try {
      const key = `downloadedSeries_${series.id}`;
      const savedRaw = await AsyncStorage.getItem(key);
      if (!savedRaw) return;

      const savedEpisodes = JSON.parse(savedRaw);
      delete savedEpisodes[episodeId];
      await AsyncStorage.setItem(key, JSON.stringify(savedEpisodes));
    } catch (e) {
      console.error('Failed to remove episode download', e);
    }
  };

  const handleDownloadEpisode = async (episode) => {
    const source = episode.downloads?.[0] || episode.videos?.[0];
    if (!source) {
      Alert.alert('Error', 'No download source available for this episode');
      return;
    }

    const url = source.link;
    const path = getLocalPath(url);

    // Update status to show downloading...
    setDownloadingEpisodes(prev => ({
      ...prev,
      [episode.id]: true
    }));

    setDownloadStatus(prev => ({
      ...prev,
      [episode.id]: { ...prev[episode.id], isDownloading: true, progress: 0 }
    }));

    try {
      let lastUpdate = 0;
      // Fake progress interval
      let fakeProgress = 0;
      const fakeInterval = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + (Math.random() * 2), 95);
        setDownloadStatus(prev => {
          const current = prev[episode.id] || {};
          if (!current.hasRealProgress) {
            return {
              ...prev,
              [episode.id]: { ...current, isDownloading: true, progress: fakeProgress, hasRealProgress: false }
            };
          }
          return prev;
        });
      }, 500);

      const download = RNFS.downloadFile({
        fromUrl: url,
        toFile: path,
        progress: (res) => {
          if (res.contentLength > 0) {
            const progress = (res.bytesWritten / res.contentLength) * 100;
            const now = Date.now();
            if (now - lastUpdate > 500 || progress === 100) {
              lastUpdate = now;
              setDownloadStatus(prev => ({
                ...prev,
                [episode.id]: { ...prev[episode.id], isDownloading: true, progress, hasRealProgress: true }
              }));
            }
          }
        }
      });

      await download.promise;
      clearInterval(fakeInterval);

      setDownloadStatus(prev => ({
        ...prev,
        [episode.id]: { isDownloaded: true, isDownloading: false, progress: 100 }
      }));

      setDownloadingEpisodes(prev => ({
        ...prev,
        [episode.id]: false
      }));

      // Save metadata for offline access
      const selectedSeason = series.seasons[selectedSeasonIndex];
      await saveDownloadedEpisode(series, selectedSeason, episode, url, path);

      Alert.alert('Success', 'Episode downloaded successfully!');

    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Download failed.');
      setDownloadStatus(prev => ({
        ...prev,
        [episode.id]: { ...prev[episode.id], isDownloading: false }
      }));
      setDownloadingEpisodes(prev => ({
        ...prev,
        [episode.id]: false
      }));
    }
  };

  const handleDeleteEpisode = async (episode) => {
    const source = episode.downloads?.[0] || episode.videos?.[0];
    if (!source) return;

    const url = source.link;
    const path = getLocalPath(url);

    Alert.alert(
      'Delete Episode',
      'Are you sure you want to delete this episode?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await RNFS.unlink(path);
              setDownloadStatus(prev => ({
                ...prev,
                [episode.id]: { isDownloaded: false, progress: 0 }
              }));
              await removeDownloadedEpisode(episode.id);
              Alert.alert('Deleted', 'Episode removed from device.');
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete episode');
            }
          }
        }
      ]
    );
  };

  const handlePlayEpisode = async (episode) => {


    const source = episode.videos?.[0] || episode.downloads?.[0];
    if (!source) {
      Alert.alert('Error', 'No video source available for this episode');
      return;
    }

    let videoUrl = source.link;
    let title = `${series.name} - ${episode.name}`;

    // Check for local file first
    const localPath = getLocalPath(source.link);
    const exists = await RNFS.exists(localPath);

    if (exists) {
      videoUrl = localPath; // Play local file
      title += " (Offline)";
    }

    navigation.navigate('Player', {
      videoUrl,
      title,
      spokenLanguages: series.spoken_languages || [],
      subtitles: episode.substitles || [],
      movieData: { ...series, episode }
    });

    // Mark as watched
    saveWatchProgress(episode.id);
  };

  const renderSeasonItem = ({ item: season, index }) => {
    const progress = calculateSeasonProgress(season);
    return (
      <TouchableOpacity
        style={[
          styles.seasonTab,
          selectedSeasonIndex === index && styles.seasonTabActive
        ]}
        onPress={() => setSelectedSeasonIndex(index)}
      >
        <Text style={styles.seasonText}>{season.name}</Text>
        {progress > 0 && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEpisodeItem = ({ item: episode }) => {
    const isWatched = watchProgress[episode.id];
    const episodeStatus = downloadStatus[episode.id] || {};
    const isDownloading = downloadingEpisodes[episode.id];

    return (
      <View style={styles.episodeCard}>
        <TouchableOpacity
          style={styles.episodeMain}
          onPress={() => handlePlayEpisode(episode)}
          disabled={isDownloading}
        >
          <View style={styles.episodeNumber}>
            <Text style={styles.episodeNumText}>{episode.episode_number}</Text>
            {isWatched && (
              <View style={styles.watchedBadge}>
                <Icon name="check" size={10} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.episodeInfo}>
            <Text style={styles.episodeTitle}>
              {episode.name}
            </Text>
            <Text style={styles.episodeMeta}>
              {episode.videos?.length > 0
                ? `${episode.videos[0].lang} • ${episode.videos[0].server}`
                : 'No sources'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.episodeActions}>
          {isDownloading ? (
            <View style={styles.downloadProgress}>
              <ActivityIndicator size="small" color="#ff375f" />
              <Text style={styles.downloadProgressText}>
                {Math.round(episodeStatus.progress || 0)}%
              </Text>
            </View>
          ) : episodeStatus.isDownloaded ? (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteEpisode(episode)}
            >
              <Icon name="delete" size={20} color="#666" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => handleDownloadEpisode(episode)}
              disabled={isDownloading}
            >
              <Icon name="file-download" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ff375f" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Loading series details...</Text>
      </View>
    );
  }

  const selectedSeason = series.seasons?.[selectedSeasonIndex];

  // Calculate total episodes across all seasons
  const totalEpisodes = series.seasons?.reduce((total, season) =>
    total + (season.episodes?.length || 0), 0
  ) || 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Series Header with backdrop */}
      <SeriesHeader series={series} navigation={navigation} totalEpisodes={totalEpisodes} />

      {/* Season Selection Tabs */}
      {series.seasons && series.seasons.length > 0 && (
        <View style={styles.seasonSection}>
          <Text style={styles.sectionTitle}>Seasons</Text>
          <FlatList
            horizontal
            data={series.seasons || []}
            renderItem={renderSeasonItem}
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.seasonList}
          />
        </View>
      )}

      {/* Episodes List */}
      <View style={styles.episodeSection}>
        {selectedSeason ? (
          <>
            <View style={styles.episodeHeader}>
              <Text style={styles.sectionTitle}>
                {selectedSeason.name || 'Episodes'}
              </Text>
              <Text style={styles.episodeCount}>
                {selectedSeason.episodes?.length || 0} Episodes
              </Text>
            </View>

            {selectedSeason.episodes && selectedSeason.episodes.length > 0 ? (
              <FlatList
                data={selectedSeason.episodes || []}
                renderItem={renderEpisodeItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.episodeList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.noEpisodes}>
                <Icon name="tv-off" size={50} color="#666" />
                <Text style={styles.noEpisodesText}>No episodes available</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.noSeasons}>
            <Icon name="error-outline" size={50} color="#666" />
            <Text style={styles.noSeasonsText}>No seasons available</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const SeriesHeader = ({ series, navigation, totalEpisodes }) => (
  <View style={styles.headerContainer}>
    <Image
      source={{ uri: series.backdrop_path || series.poster_path }}
      style={styles.backdrop}
    />
    <View style={styles.backdropOverlay} />

    <TouchableOpacity
      style={styles.backButton}
      onPress={() => navigation.goBack()}
    >
      <Icon name="arrow-back" size={28} color="#fff" />
    </TouchableOpacity>

    <View style={styles.headerContent}>
      <Image source={{ uri: series.poster_path }} style={styles.poster} />
      <View style={styles.headerInfo}>
        <Text style={styles.title}>{series.name}</Text>
        <Text style={styles.meta}>
          {series.first_air_date?.split('-')[0]} • {series.vote_average || 'N/A'}/10
          {totalEpisodes > 0 && ` • ${totalEpisodes} Episodes`}
        </Text>

        {series.newEpisodes > 0 && (
          <View style={styles.newIndicator}>
            <Icon name="fiber-new" size={16} color="#fff" />
            <Text style={styles.newText}>{series.newEpisodes} new episodes</Text>
          </View>
        )}

        {series.overview && (
          <Text style={styles.overview} numberOfLines={3}>
            {series.overview}
          </Text>
        )}
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerContainer: {
    height: 320,
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  headerContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  poster: {
    width: 100,
    height: 150,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
    marginBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  meta: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  overview: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 5,
    lineHeight: 16,
  },
  newIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 55, 95, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  newText: {
    color: '#ff375f',
    fontSize: 12,
    marginLeft: 5,
  },
  seasonSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  seasonList: {
    paddingRight: 20,
  },
  seasonTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  seasonTabActive: {
    backgroundColor: '#ff375f',
  },
  seasonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  progressBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  progressText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  episodeSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  episodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  episodeCount: {
    color: '#666',
    fontSize: 14,
  },
  episodeList: {
    paddingBottom: 40,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  episodeMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  episodeNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  episodeNumText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  watchedBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  episodeMeta: {
    color: '#666',
    fontSize: 12,
  },
  episodeActions: {
    marginLeft: 10,
  },
  downloadButton: {
    backgroundColor: '#333',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#333',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadProgress: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  downloadProgressText: {
    color: '#ff375f',
    fontSize: 10,
    marginTop: 2,
  },
  noEpisodes: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  noEpisodesText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
  },
  noSeasons: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  noSeasonsText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
  },
});

export default SeriesDetailScreen;