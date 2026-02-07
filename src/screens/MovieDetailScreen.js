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
    Alert,
    Platform,
    BackHandler,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

import movieApi from '../api/movie_api';

const { width } = Dimensions.get('window');

const MovieDetailScreen = ({ route, navigation }) => {
    // Initialize with params, but allow updates
    const [movie, setMovie] = useState(route.params.movie);
    const [loading, setLoading] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState({}); // { url: { isDownloaded: bool, progress: number } }

    useEffect(() => {
        loadFullDetails();
        checkDownloads();
    }, []);

    const loadFullDetails = async () => {
        // If we don't have video links, we need to fetch them
        if (!movie.videos || movie.videos.length === 0) {
            console.log("Fetching full details for movie:", movie.id);
            setLoading(true);
            try {
                const fullDetails = await movieApi.getMovieDetail(movie.id);
                if (fullDetails) {
                    setMovie(prev => ({ ...prev, ...fullDetails }));
                    // Update downloads check with new links
                    checkDownloads(fullDetails);
                }
            } catch (error) {
                console.error("Error fetching movie details:", error);
                Alert.alert("Error", "Failed to load movie details.");
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

    const checkDownloads = async (movieData = movie) => {
        const status = {};
        const sources = [
            ...(movieData.videos || []),
            ...(movieData.downloads || [])
        ];

        for (const source of sources) {
            if (!source.link) continue;
            const path = getLocalPath(source.link);
            const exists = await RNFS.exists(path);
            status[source.link] = { isDownloaded: exists, progress: 0 };
        }
        setDownloadStatus(status);
    };

    const saveDownloadedMovie = async (movieData, downloadUrl, localPath) => {
        try {
            const savedRaw = await AsyncStorage.getItem('downloadedMovies');
            const savedMovies = savedRaw ? JSON.parse(savedRaw) : [];

            // Check if already saved
            const existingIndex = savedMovies.findIndex(m => m.id === movieData.id);
            const downloadEntry = {
                ...movieData,
                offlineUrl: localPath,
                downloadDate: new Date().toISOString()
            };

            if (existingIndex >= 0) {
                savedMovies[existingIndex] = downloadEntry;
            } else {
                savedMovies.push(downloadEntry);
            }

            await AsyncStorage.setItem('downloadedMovies', JSON.stringify(savedMovies));
        } catch (e) {
            console.error('Failed to save download metadata', e);
        }
    };

    const removeDownloadedMovie = async (movieData) => {
        try {
            const savedRaw = await AsyncStorage.getItem('downloadedMovies');
            if (!savedRaw) return;

            const savedMovies = JSON.parse(savedRaw);
            const filtered = savedMovies.filter(m => m.id !== movieData.id);
            await AsyncStorage.setItem('downloadedMovies', JSON.stringify(filtered));
        } catch (e) {
            console.error('Failed to remove download metadata', e);
        }
    };

    const handleDownload = async (url) => {
        const path = getLocalPath(url);

        // Update status to show downloading...
        setDownloadStatus(prev => ({
            ...prev,
            [url]: { ...prev[url], isDownloading: true, progress: 0 }
        }));

        try {
            let lastUpdate = 0;
            // Fake progress interval
            let fakeProgress = 0;
            const fakeInterval = setInterval(() => {
                fakeProgress = Math.min(fakeProgress + (Math.random() * 2), 95); // Increment up to 95%
                setDownloadStatus(prev => {
                    const current = prev[url] || {};
                    // Only update if we haven't received real progress events (contentLength > 0)
                    if (!current.hasRealProgress) {
                        return {
                            ...prev,
                            [url]: { ...current, isDownloading: true, progress: fakeProgress, hasRealProgress: false }
                        };
                    }
                    return prev;
                });
            }, 500);

            const download = RNFS.downloadFile({
                fromUrl: url,
                toFile: path,
                progress: (res) => {
                    // Check if content length is known
                    if (res.contentLength > 0) {
                        const progress = (res.bytesWritten / res.contentLength) * 100;
                        const now = Date.now();
                        // Throttle updates: every 500ms or if complete
                        if (now - lastUpdate > 500 || progress === 100) {
                            lastUpdate = now;
                            setDownloadStatus(prev => ({
                                ...prev,
                                [url]: { ...prev[url], isDownloading: true, progress, hasRealProgress: true }
                            }));
                        }
                    }
                    // If contentLength is -1, we rely on the fakeInterval to show something happening
                }
            });

            await download.promise;

            clearInterval(fakeInterval);

            setDownloadStatus(prev => ({
                ...prev,
                [url]: { isDownloaded: true, isDownloading: false, progress: 100 }
            }));

            // Save metadata for offline access
            await saveDownloadedMovie(movie, url, path);

            Alert.alert('Success', 'Download complete!');

        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Download failed.');
            setDownloadStatus(prev => ({
                ...prev,
                [url]: { ...prev[url], isDownloading: false }
            }));
        }
    };

    const handleDelete = async (url) => {
        const path = getLocalPath(url);
        try {
            await RNFS.unlink(path);
            setDownloadStatus(prev => ({
                ...prev,
                [url]: { isDownloaded: false, progress: 0 }
            }));
            await removeDownloadedMovie(movie); // Remove from offline list
            Alert.alert('Deleted', 'File removed from device.');
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const handlePlay = async (url, isStream = true) => {


        let videoUrl = url;
        let title = movie.title;

        // Check for local file first
        const localPath = getLocalPath(url);
        const exists = await RNFS.exists(localPath);

        if (exists) {
            videoUrl = localPath; // Play local file
            title += " (Offline)";
        }

        navigation.navigate('Player', {
            videoUrl,
            title,
            spokenLanguages: movie.spoken_languages || [],
            subtitles: movie.substitles || [],
            movieData: movie
        });
    };

    const videoSources = [
        ...(movie.videos || []).map(v => ({ ...v, type: 'Stream', label: `${v.server} (${v.lang})` })),
        ...(movie.downloads || []).map(d => ({ ...d, type: 'Download', label: `${d.server} (${d.lang})` }))
    ];

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#ff375f" />
                <Text style={{ color: '#fff', marginTop: 10 }}>Loading details...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Backdrop Image */}
                <View style={styles.backdropContainer}>
                    <Image
                        source={{ uri: movie.backdrop_path || movie.poster_path }}
                        style={styles.backdrop}
                        resizeMode="cover"
                    />
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-back" size={28} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.gradientOverlay} />
                </View>

                {/* Info Section */}
                <View style={styles.infoContainer}>
                    <Image source={{ uri: movie.poster_path }} style={styles.poster} />
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>{movie.title}</Text>
                        <Text style={styles.meta}>
                            {movie.release_date ? movie.release_date.split('-')[0] : 'N/A'} • {movie.vote_average}/10
                        </Text>
                        <Text style={styles.genres}>
                            {Array.isArray(movie.genres)
                                ? movie.genres.map(g => g.name || g).join(', ')
                                : (typeof movie.genres === 'string' ? movie.genres : 'N/A')}
                        </Text>
                    </View>
                </View>

                {/* Overview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Overview</Text>
                    <Text style={styles.overview}>{movie.overview}</Text>
                </View>

                {/* Video Sources / Play Options */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Watch Now</Text>
                    {videoSources.length > 0 ? (
                        videoSources.map((source, index) => {
                            const status = downloadStatus[source.link] || {};
                            return (
                                <View key={index} style={styles.sourceCard}>
                                    <TouchableOpacity
                                        style={styles.sourceMain}
                                        onPress={() => handlePlay(source.link)}
                                    >
                                        <Icon name={source.type === 'Stream' ? 'play-circle-outline' : 'file-download'} size={24} color="#ff375f" />
                                        <View style={styles.sourceText}>
                                            <Text style={styles.sourceLabel}>{source.label}</Text>
                                            <Text style={styles.sourceType}>
                                                {status.isDownloaded ? 'Downloaded (Offline Ready)' : source.type}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Action Buttons */}
                                    <View style={styles.actionButtons}>
                                        {status.isDownloading ? (
                                            <Text style={styles.downloadText}>{Math.round(status.progress || 0)}%</Text>
                                        ) : status.isDownloaded ? (
                                            <TouchableOpacity onPress={() => handleDelete(source.link)}>
                                                <Icon name="delete" size={24} color="#666" />
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity onPress={() => handleDownload(source.link)}>
                                                <Icon name="file-download" size={24} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    ) : (
                        <Text style={styles.noSources}>No video sources available.</Text>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center'
    },
    scrollContent: {
        paddingBottom: 40,
    },
    backdropContainer: {
        width: width,
        height: 250,
        position: 'relative',
    },
    backdrop: {
        width: '100%',
        height: '100%',
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
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    infoContainer: {
        flexDirection: 'row',
        padding: 20,
        marginTop: -40,
    },
    poster: {
        width: 100,
        height: 150,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#333',
    },
    textContainer: {
        flex: 1,
        marginLeft: 15,
        justifyContent: 'flex-end',
        paddingBottom: 10,
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    meta: {
        color: '#ccc',
        fontSize: 14,
        marginBottom: 5,
    },
    genres: {
        color: '#888',
        fontSize: 12,
    },
    section: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#222',
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
    },
    overview: {
        color: '#ccc',
        fontSize: 14,
        lineHeight: 22,
    },
    sourceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1a1a1a',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
    },
    sourceMain: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    sourceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sourceText: {
        marginLeft: 15,
    },
    sourceLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    sourceType: {
        color: '#666',
        fontSize: 12,
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    downloadText: {
        color: '#ff375f',
        fontSize: 12,
        marginRight: 10,
    },
    noSources: {
        color: '#666',
        fontStyle: 'italic',
    }
});

export default MovieDetailScreen;
