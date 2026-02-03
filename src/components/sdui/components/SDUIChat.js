import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DeviceInfo from 'react-native-device-info';
import { supabase } from '../../../services/SupabaseClient';

const SDUIChat = ({ data }) => {
    const { title = 'Support Chat', height = 400 } = data;
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        setupChat();
    }, []);

    const setupChat = async () => {
        // Get unique device ID to use as user ID for anonymous chat
        const deviceId = await DeviceInfo.getUniqueId();
        setUserId(deviceId);
        fetchMessages(deviceId);
        subscribeToMessages(deviceId);
    };

    const fetchMessages = async (deviceId) => {
        try {
            const { data, error } = await supabase
                .from('support_messages')
                .select('*')
                .eq('user_id', deviceId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching chat:', error);
            setLoading(false);
        }
    };

    const subscribeToMessages = (deviceId) => {
        const channel = supabase
            .channel('public:support_messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: `user_id=eq.${deviceId}`
                },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !userId) return;

        const content = newMessage.trim();
        setNewMessage('');

        try {
            const { error } = await supabase
                .from('support_messages')
                .insert({
                    user_id: userId,
                    content: content,
                    is_admin: false, // User message
                });

            if (error) {
                console.error('Send error:', error);
                // Optimistic update failed, could show alert
            }
        } catch (error) {
            console.error('Send exception:', error);
        }
    };

    return (
        <View style={[styles.container, { height }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{title}</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color="#ff375f" />
                </View>
            ) : (
                <View style={styles.messageListContainer}>
                    {messages.map((item) => {
                        const isAdmin = item.is_admin;
                        return (
                            <View key={item.id.toString()} style={[
                                styles.messageBubble,
                                isAdmin ? styles.adminBubble : styles.userBubble
                            ]}>
                                <Text style={[
                                    styles.messageText,
                                    isAdmin ? styles.adminText : styles.userText
                                ]}>
                                    {item.content}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholder="Type a message..."
                        placeholderTextColor="#666"
                        returnKeyType="send"
                        onSubmitEditing={sendMessage}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !newMessage.trim() && styles.disabledSend]}
                        onPress={sendMessage}
                        disabled={!newMessage.trim()}
                    >
                        <Icon name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        marginBottom: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333'
    },
    header: {
        padding: 10,
        backgroundColor: '#333',
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    headerTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageListContainer: {
        padding: 10,
        flex: 1,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 10,
        borderRadius: 12,
        marginBottom: 8,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#ff375f',
        borderBottomRightRadius: 2,
    },
    adminBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#444',
        borderBottomLeftRadius: 2,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    userText: {
        color: '#fff',
    },
    adminText: {
        color: '#eee',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 8,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: '#222',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#000',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        color: '#fff',
        marginRight: 8,
        fontSize: 14,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ff375f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledSend: {
        backgroundColor: '#555',
    }
});

export default SDUIChat;
