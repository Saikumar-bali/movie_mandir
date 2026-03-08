import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Video from 'react-native-video';

const { width } = Dimensions.get('window');

const SDUIVideo = ({ data }) => {
    const { url, height = 250, autoPlay = true, loop = true } = data;

    if (!url) return null;

    return (
        <View style={[styles.container, { height }]}>
            <Video
                source={{ uri: url }}
                style={styles.video}
                resizeMode="contain"
                repeat={loop}
                paused={!autoPlay}
                controls={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 15,
        backgroundColor: '#000',
        borderRadius: 8,
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
    },
});

export default SDUIVideo;
