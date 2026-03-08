import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, Animated } from 'react-native';

const { width: windowWidth } = Dimensions.get('window');

const SDUISlider = ({ data }) => {
    const { images = [], interval = 3000, height = 200, resizeMode = 'cover' } = data;
    const [currentIndex, setCurrentIndex] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (images.length <= 1) return;

        const timer = setInterval(() => {
            // Fade out
            Animated.timing(fadeAnim, {
                toValue: 0.5,
                duration: 500,
                useNativeDriver: true,
            }).start(() => {
                // Change image
                setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
                // Fade in
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            });
        }, interval);

        return () => clearInterval(timer);
    }, [images, interval]);

    if (!images || images.length === 0) return null;

    return (
        <View style={[styles.container, { height: Number(height) }]}>
            <Animated.Image
                source={{ uri: images[currentIndex] }}
                style={[
                    styles.image,
                    { height: Number(height), opacity: fadeAnim }
                ]}
                resizeMode={resizeMode}
            />

            {/* Dots Indicator */}
            <View style={styles.indicatorContainer}>
                {images.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            currentIndex === index ? styles.activeDot : styles.inactiveDot
                        ]}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 15,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#111',
    },
    image: {
        width: '100%',
    },
    indicatorContainer: {
        position: 'absolute',
        bottom: 10,
        flexDirection: 'row',
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 3,
    },
    activeDot: {
        backgroundColor: '#ff375f',
    },
    inactiveDot: {
        backgroundColor: 'rgba(255,255,255,0.5)',
    }
});

export default SDUISlider;
