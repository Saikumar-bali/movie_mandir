import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

const SDUIWebView = ({ data }) => {
    const { url, height = 300, scrollEnabled = true } = data;

    if (!url) return null;

    return (
        <View style={[styles.container, { height: Number(height) }]}>
            <WebView
                source={{ uri: url }}
                style={styles.webview}
                scrollEnabled={scrollEnabled}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator color="#ff375f" />
                    </View>
                )}
                allowsFullscreenVideo={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
            />
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
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111',
    }
});

export default SDUIWebView;
