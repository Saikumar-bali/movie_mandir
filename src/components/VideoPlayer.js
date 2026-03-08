import React, { useState, useRef } from 'react';
import { View, StyleSheet, Modal, TouchableWithoutFeedback, TouchableOpacity, Text } from 'react-native';
import Video from 'react-native-video';

const VideoPlayer = ({ videoUrl, onClose, showParts, currentPart, totalParts, onNextPart }) => {
    const videoRef = useRef(null);

    return (
        <Modal visible={!!videoUrl} transparent={true} onRequestClose={onClose}>
            <View style={styles.container}>
                <Video
                    ref={videoRef}
                    source={{ uri: videoUrl }}
                    style={styles.video}
                    controls={true}
                    resizeMode="contain"
                    onEnd={onClose}
                />
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>X</Text>
                </TouchableOpacity>
                {showParts && (
                    <View style={styles.partsContainer}>
                        <Text style={styles.partsText}>{`Part ${currentPart} of ${totalParts}`}</Text>
                        {currentPart < totalParts && (
                            <TouchableOpacity onPress={onNextPart} style={styles.nextPartButton}>
                                <Text style={styles.nextPartButtonText}>Next Part</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    partsContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 5,
        padding: 10,
    },
    partsText: {
        color: 'white',
        fontSize: 16,
    },
    nextPartButton: {
        marginTop: 10,
        backgroundColor: '#fff',
        borderRadius: 5,
        padding: 10,
    },
    nextPartButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default VideoPlayer;