import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import PermissionService from '../services/PermissionService';

const PermissionScreen = ({ visible, onClose, onRecheck }) => {
  const [isChecking, setIsChecking] = useState(false);

  const openFileManagerSettings = async () => {
    if (Platform.OS !== 'android') return;
    
    try {
      setIsChecking(true);
      await PermissionService.requestPermissions();
    } catch (err) {
      console.error('Failed to open settings:', err);
      Linking.openSettings();
    } finally {
      setTimeout(() => setIsChecking(false), 2000);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.icon}>📁</Text>
          <Text style={styles.title}>Full File Access Required</Text>
          <Text style={styles.description}>
            To perform well we need the **"All Files Access"** permission.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={openFileManagerSettings}
            disabled={isChecking}
          >
            <Text style={styles.buttonText}>Grant All Files Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Later</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.recheckButton} onPress={onRecheck}>
            <Text style={styles.recheckIcon}>🔄</Text>
            <Text style={styles.recheckButtonText}>Re-check Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  icon: {
    fontSize: 50,
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#238636',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: '#8b949e',
    fontSize: 14,
  },
  recheckButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  recheckIcon: {
    fontSize: 16,
    marginRight: 10,
    color: '#8b949e',
  },
  recheckButtonText: {
    color: '#8b949e',
    fontSize: 14,
  }
});

export default PermissionScreen;