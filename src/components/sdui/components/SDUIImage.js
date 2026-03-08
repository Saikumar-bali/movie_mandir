import React from 'react';
import { Image, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const SDUIImage = ({ data }) => {
    const { url, height = 200, resizeMode = 'cover', borderRadius = 8 } = data;

    if (!url) return null;

    return (
        <Image
            source={{ uri: url }}
            style={[
                styles.image,
                { height: Number(height), borderRadius }
            ]}
            resizeMode={resizeMode}
        />
    );
};

const styles = StyleSheet.create({
    image: {
        width: '100%',
        marginBottom: 15,
        backgroundColor: '#333',
    },
});

export default SDUIImage;
