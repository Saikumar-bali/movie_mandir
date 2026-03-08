import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SDUIProtectedWrapper = ({ data, children }) => {
    const { security_key } = data;
    const [isUnlocked, setIsUnlocked] = useState(!security_key);
    const [inputKey, setInputKey] = useState('');

    const handleUnlock = () => {
        if (inputKey === security_key) {
            setIsUnlocked(true);
        } else {
            Alert.alert('Incorrect Key', 'The security key you entered is invalid.');
            setInputKey('');
        }
    };

    if (isUnlocked) {
        return children;
    }

    return (
        <View style={styles.container}>
            <Icon name="lock" size={40} color="#ff375f" style={styles.icon} />
            <Text style={styles.title}>Protected Content</Text>
            <Text style={styles.subtitle}>Please enter the security key to view this item.</Text>

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    value={inputKey}
                    onChangeText={setInputKey}
                    placeholder="Enter Key"
                    placeholderTextColor="#666"
                    secureTextEntry
                    keyboardType="numeric"
                />
                <TouchableOpacity style={styles.unlockButton} onPress={handleUnlock}>
                    <Text style={styles.unlockText}>Unlock</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#333',
        borderStyle: 'dashed',
    },
    icon: {
        marginBottom: 10,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        color: '#888',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 15,
    },
    inputRow: {
        flexDirection: 'row',
        width: '100%',
    },
    input: {
        flex: 1,
        backgroundColor: '#000',
        borderRadius: 8,
        paddingHorizontal: 15,
        color: '#fff',
        height: 45,
        marginRight: 10,
    },
    unlockButton: {
        backgroundColor: '#ff375f',
        borderRadius: 8,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unlockText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default SDUIProtectedWrapper;
