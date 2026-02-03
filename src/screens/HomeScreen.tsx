import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StatusBar,
    SafeAreaView,
    Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAllMovies, searchMovies } from '../services/api';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const navigation = useNavigation();

    const fetchMovies = async () => {
        try {
            setLoading(true);
            const data = await getAllMovies();
            setMovies(data);
        } catch (error) {
            console.error('Failed to fetch movies', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (text) => {
        setSearchQuery(text);
        if (text.length > 2) {
            setIsSearching(true);
            try {
                const results = await searchMovies(text);
                setMovies(results);
            } catch (error) {
                console.error('Search failed', error);
            } finally {
                setIsSearching(false);
            }
        } else if (text.length === 0) {
            fetchMovies();
        }
    };

    useEffect(() => {
        fetchMovies();
    }, []);

    const renderMovieItem = ({ item }) => (
        <TouchableOpacity
            style={styles.videoContainer}
            onPress={() => {
                // Navigate to player or details
                console.log('Pressed movie:', item.title);
                // navigation.navigate('VideoPlayer', { videoId: item.id, videoUrl: item.video_url });
            }}
        >
            <View style={styles.thumbnailContainer}>
                <Image
                    source={{ uri: item.poster_path || 'https://via.placeholder.com/300x169' }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />
                <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>HD</Text>
                </View>
            </View>
            <View style={styles.detailsContainer}>
                <View style={styles.avatarContainer}>
                    {/* Placeholder for channel avatar */}
                    <View style={styles.avatar} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.subtitle}>
                        {item.genres} • {item.languages} • {item.vote_average} ★
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

            {/* Header / Search Bar */}
            <View style={styles.header}>
                <View style={styles.searchBar}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search movies..."
                        placeholderTextColor="#aaa"
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#FF0000" />
                </View>
            ) : (
                <FlatList
                    data={movies}
                    renderItem={renderMovieItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshing={loading}
                    onRefresh={fetchMovies}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f0f', // YouTube Dark Background
    },
    header: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#272727',
        backgroundColor: '#0f0f0f',
    },
    searchBar: {
        backgroundColor: '#272727',
        borderRadius: 20,
        paddingHorizontal: 15,
        height: 40,
        justifyContent: 'center',
    },
    searchInput: {
        color: '#fff',
        fontSize: 16,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 20,
    },
    videoContainer: {
        marginBottom: 20,
        backgroundColor: '#0f0f0f',
    },
    thumbnailContainer: {
        width: '100%',
        height: 220,
        position: 'relative',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    durationBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    durationText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    detailsContainer: {
        flexDirection: 'row',
        padding: 12,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#555',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    subtitle: {
        color: '#aaa',
        fontSize: 12,
    },
});

export default HomeScreen;
