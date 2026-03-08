import RNFS from 'react-native-fs';

// --- CONFIGURATION ---
const CATEGORIES = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.svg'],
  video: ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.3gp'],
  audio: ['.mp3', '.wav', '.flac', '.ogg', '.m4a'],
  doc: ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.xls', '.pptx', '.ppt', '.odt', '.rtf', '.csv'],
  archive: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  android_app: ['.apk'],
};

// Explicit high-value directories to prioritize or check separately (Android 11+ paths)
const TARGET_DIRECTORIES = [
  // Common shared folders
  'Download', 'DCIM', 'Pictures', 'Movies', 'Music', 
  // WhatsApp/Telegram media (common new locations, requires MANAGE_EXTERNAL_STORAGE)
  'Android/media/com.whatsapp/WhatsApp/Media',
  'Android/media/org.telegram.messenger/Telegram/Telegram Documents',
  // Legacy paths (good fallback)
  'WhatsApp/Media',
  'Telegram/Telegram Documents',
];


const FileSystemService = {
  /**
   * Aggressive file scanning that tries multiple approaches
   */
  scanFiles: async () => {
    // Increased depth slightly for truly deep file systems.
    console.log('[FileSystemService] Starting advanced file scan (Maximum depth 7)');
    
    const externalStoragePath = RNFS.ExternalStorageDirectoryPath;
    let allFiles = [];

    /**
     * Safe directory scanner
     * Recursively scans a given path.
     */
    const scanDirectory = async (dirPath, depth = 0) => {
      // Limit recursion depth to prevent indefinite scans or memory issues
      if (depth > 7) return []; 
      
      let files = [];
      
      try {
        const items = await RNFS.readDir(dirPath);
        
        for (const item of items) {
          try {
            if (item.isDirectory()) {
              
              // Skip known non-user-content folders
              if (item.path.includes('.thumbnails') ||
                  item.path.includes('.trash') ||
                  item.path.includes('Android/obb')) { 
                continue;
              }
              
              // Log the scan of a major directory or a nested one
              if (depth === 0) {
                //  console.log(`[FileSystemService] Scanning Top-Level: ${item.name} (${item.path})`);
              }
              
              // Recursively scan subdirectories
              const subDirFiles = await scanDirectory(item.path, depth + 1);
              files = files.concat(subDirFiles);

            } else {
              // Process file
              const fileItem = processFileItem(item);
              if (fileItem) {
                files.push(fileItem);
              }
            }
          } catch (itemError) {
            // Log for debug, but continue with next item
            // console.warn(`Error reading item ${item.path}:`, itemError.message);
            continue;
          }
        }
      } catch (error) {
        // --- ADVANCED ANDROID 12+ ERROR HANDLING ---
        // Catch and handle the specific error related to blocked Android/data/ folders.
        if (error.message && error.message.includes('PromiseImpl.reject')) {
            console.warn(`[FileSystemService] Failed to read restricted directory ${dirPath}. (Permission Blocked by OS)`);
        } else {
            console.warn(`[FileSystemService] Failed to read directory ${dirPath}:`, error.message);
        }
      }
      
      return files;
    };

    /**
     * Process individual file item
     */
    const processFileItem = (item) => {
      try {
        if (item.name === '.nomedia' || item.size < 1024) {
          return null;
        }
        const extension = item.name.includes('.') 
          ? item.name.substring(item.name.lastIndexOf('.')).toLowerCase()
          : '';
        
        let category = 'other';
        
        for (const cat in CATEGORIES) {
          if (CATEGORIES[cat].includes(extension)) {
            category = cat;
            break;
          }
        }

        if (category === 'other') {
          return null;
        }

        // Return a normalized file object
        return {
          name: item.name,
          path: item.path,
          size: item.size || 0,
          // Convert mtime Date object to numeric milliseconds for consistency
          mtime: item.mtime instanceof Date ? item.mtime.getTime() : new Date(0).getTime(), 
          category: category,
          extension: extension
        };
      } catch (error) {
        // console.error('Error processing file item:', error);
        return null;
      }
    };

    // ----------------------------------------------------------------------
    // STRATEGY 1: Aggressively scan all top-level directories in External Storage
    // ----------------------------------------------------------------------
    
    try {
      // Initiate the full scan from the root of the external storage
      allFiles = await scanDirectory(externalStoragePath, 0);
      
      // ----------------------------------------------------------------------
      // STRATEGY 2: Check explicit target directories to ensure they are found,
      // even if they were skipped or missed in the main recursive pass.
      // This is mostly useful if `readDir` on the root only returns a partial list.
      // ----------------------------------------------------------------------
      console.log('[FileSystemService] Checking explicit target paths...');
      for (const relativePath of TARGET_DIRECTORIES) {
          const absolutePath = `${externalStoragePath}/${relativePath}`;
          try {
              const explicitFiles = await scanDirectory(absolutePath, 0);
              allFiles = allFiles.concat(explicitFiles);
              console.log(`[FileSystemService] Found ${explicitFiles.length} files in explicit path: ${relativePath}`);
          } catch (e) {
              console.warn(`[FileSystemService] Failed to read explicit path ${relativePath}:`, e.message);
          }
      }


      // Filter and clean up results
      allFiles = allFiles.filter(file => file !== null);
      // Ensure only unique files (by path) are kept, as Strategy 1 and 2 may overlap
      const uniqueFiles = Array.from(new Map(allFiles.map(file => [file.path, file])).values());

      console.log('[FileSystemService] Scan complete. Total files found:', uniqueFiles.length);
      
      // Log file distribution
      const categoryCount = {};
      uniqueFiles.forEach(file => {
        categoryCount[file.category] = (categoryCount[file.category] || 0) + 1;
      });
      console.log('[FileSystemService] File categories:', categoryCount);

      return uniqueFiles;
    } catch (error) {
      console.error('[FileSystemService] Critical error during scan:', error);
      return [];
    }
  },

  /**
   * Get storage information
   */
  getStorageInfo: async () => {
    try {
      // Use getFSInfo which typically works even without MANAGE_EXTERNAL_STORAGE
      const storageInfo = await RNFS.getFSInfo();
      
      return {
        externalStoragePath: RNFS.ExternalStorageDirectoryPath,
        totalSpace: storageInfo.totalSpace,
        freeSpace: storageInfo.freeSpace,
        usedSpace: storageInfo.totalSpace - storageInfo.freeSpace
      };
    } catch (error) {
      console.error('[FileSystemService] Error getting storage info:', error);
      return null;
    }
  }
};

export default FileSystemService;
