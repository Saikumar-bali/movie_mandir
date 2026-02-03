import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import SDUIService from '../../services/SDUIService';

// Components
import SDUIText from './components/SDUIText';
import SDUIImage from './components/SDUIImage';
import SDUIVideo from './components/SDUIVideo';
import SDUISlider from './components/SDUISlider';
import SDUIWebView from './components/SDUIWebView';
import SDUIChat from './components/SDUIChat';
import SDUIProtectedWrapper from './SDUIProtectedWrapper';

// Simple structural components
const SDUIDivider = () => <View style={{ height: 1, backgroundColor: '#333', marginVertical: 15 }} />;
const SDUISpacer = ({ data }) => <View style={{ height: data.size || 20 }} />;

const ComponentMap = {
    text: SDUIText,
    image: SDUIImage,
    video: SDUIVideo,
    slider: SDUISlider,
    webview: SDUIWebView,
    chat: SDUIChat,
    divider: SDUIDivider,
    spacer: SDUISpacer,
};

const SDUIRenderer = () => {
    const [layout, setLayout] = useState([]);

    useEffect(() => {
        // Initial fetch
        fetchLayout();

        // Subscribe to realtime updates
        const unsubscribe = SDUIService.subscribeToLayout((newLayout) => {
            setLayout(newLayout);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const fetchLayout = async () => {
        const data = await SDUIService.getLayout();
        setLayout(data);
    };

    const renderComponent = (componentData, index) => {
        const Component = ComponentMap[componentData.type];
        if (!Component) {
            console.warn(`[SDUI] Unknown component type: ${componentData.type}`);
            return null;
        }

        // Wrap in Protection Logic
        return (
            <SDUIProtectedWrapper key={`${componentData.type}_${index}`} data={componentData}>
                <Component data={componentData} />
            </SDUIProtectedWrapper>
        );
    };

    return (
        <View style={styles.container}>
            {layout.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.loadingText}>Initializing Secret Channel...</Text>
                    <Text style={styles.subText}>Waiting for configuration from server.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {layout.map((item, index) => renderComponent(item, index))}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 10,
    },
    subText: {
        color: '#666',
        textAlign: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    }
});

export default SDUIRenderer;
