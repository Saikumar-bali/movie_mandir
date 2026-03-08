import React from 'react';
import { Text, StyleSheet } from 'react-native';

const SDUIText = ({ data }) => {
    const { text, style, fontSize, color, textAlign } = data;

    const getStyle = () => {
        switch (style) {
            case 'h1': return styles.h1;
            case 'h2': return styles.h2;
            case 'h3': return styles.h3;
            case 'body': return styles.body;
            default: return styles.body;
        }
    };

    const customStyle = {
        ...(fontSize && { fontSize }),
        ...(color && { color }),
        ...(textAlign && { textAlign }),
    };

    return <Text style={[styles.base, getStyle(), customStyle]}>{text}</Text>;
};

const styles = StyleSheet.create({
    base: {
        color: '#fff',
        marginBottom: 10,
    },
    h1: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    h2: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 12,
    },
    h3: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ff375f',
        marginBottom: 8,
    },
    body: {
        fontSize: 16,
        color: '#ccc',
    },
});

export default SDUIText;
