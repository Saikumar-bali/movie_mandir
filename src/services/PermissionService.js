import { Platform, NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

const { StoragePermissionModule } = NativeModules;

const PermissionService = {
  checkPermissions: async () => {
    if (Platform.OS !== 'android') {
      return { hasBasicAccess: true, hasAllFilesAccess: true, needsAllFilesAccess: false };
    }

    const needsAllFilesAccess = Platform.Version >= 30;
    let hasBasicAccess = false;
    let hasAllFilesAccess = false;

    // Check basic storage permission
    try {
      const { check, PERMISSIONS, RESULTS } = require('react-native-permissions');
      const basicPermission = Platform.Version < 33 
        ? PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE
        : PERMISSIONS.ANDROID.READ_MEDIA_IMAGES;
      
      const basicStatus = await check(basicPermission);
      hasBasicAccess = basicStatus === RESULTS.GRANTED;
    } catch (error) {
      console.warn('[PermissionService] Error checking basic permissions:', error);
      hasBasicAccess = Platform.Version < 30;
    }

    // Check All Files Access using our native module
    if (needsAllFilesAccess) {
      try {
        hasAllFilesAccess = await StoragePermissionModule.checkManageExternalStorage();
        console.log(`[PermissionService] Native module check result: ${hasAllFilesAccess}`);
      } catch (error) {
        console.error('[PermissionService] Error checking MANAGE_EXTERNAL_STORAGE:', error);
        // Fallback: try file system test
        try {
          const testPath = `${RNFS.ExternalStorageDirectoryPath}/Android/data`;
          await RNFS.readDir(testPath);
          hasAllFilesAccess = true;
        } catch (fsError) {
          hasAllFilesAccess = false;
        }
      }
    }
    
    return { hasBasicAccess, hasAllFilesAccess, needsAllFilesAccess };
  },

  requestPermissions: async () => {
    if (Platform.OS !== 'android') return;

    try {
      if (Platform.Version >= 30) {
        await StoragePermissionModule.openStorageSettings();
      } else {
        const { request, PERMISSIONS } = require('react-native-permissions');
        await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
      }
    } catch (error) {
      console.error('[PermissionService] Error requesting permissions:', error);
      const { Linking } = require('react-native');
      Linking.openSettings();
    }
  },
};

export default PermissionService;