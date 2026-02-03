import BackgroundFetch from 'react-native-background-fetch';
import BackgroundTimer from 'react-native-background-timer';
import { uploadBackupToTelegram } from './api';
import { Platform } from 'react-native';

// Simple queue to hold files to be backed up
// In a real app, this should be persisted to AsyncStorage or SQLite
let backupQueue: any[] = [];
let isUploading = false;

const processQueue = async () => {
    if (isUploading || backupQueue.length === 0) return;

    isUploading = true;

    // Start a background timer to keep the app alive during upload (iOS/Android)
    // On Android, this doesn't guarantee execution if the app is killed, 
    // but helps if it's just backgrounded.
    const backgroundTaskId = BackgroundTimer.start();

    try {
        while (backupQueue.length > 0) {
            const file = backupQueue[0];
            console.log('[BackgroundService] Starting upload for:', file.name);

            const formData = new FormData();
            formData.append('chat_id', file.chatId);
            formData.append('document', {
                uri: file.uri,
                type: file.type,
                name: file.name,
            });

            await uploadBackupToTelegram(formData);
            console.log('[BackgroundService] Upload success:', file.name);

            // Remove from queue on success
            backupQueue.shift();
        }
    } catch (error) {
        console.error('[BackgroundService] Upload failed:', error);
        // Retry logic could be added here (e.g., move to end of queue or increment retry count)
    } finally {
        isUploading = false;
        BackgroundTimer.stop(backgroundTaskId);
        console.log('[BackgroundService] Queue processing finished');
    }
};

export const addToBackupQueue = (file: any) => {
    console.log('[BackgroundService] Adding to queue:', file.name);
    backupQueue.push(file);
    processQueue();
};

export const initBackgroundFetch = async () => {
    const status = await BackgroundFetch.configure(
        {
            minimumFetchInterval: 15, // minutes
            stopOnTerminate: false,
            startOnBoot: true,
            enableHeadless: true,
            forceAlarmManager: true, // Android
        },
        async (taskId) => {
            console.log('[BackgroundFetch] Received background-fetch event: ', taskId);

            // Check if there are pending items in queue (if we persisted them)
            // For now, we just log. In a real app, we'd load from storage and process.
            await processQueue();

            BackgroundFetch.finish(taskId);
        },
        (error) => {
            console.error('[BackgroundFetch] Failed to configure:', error);
        }
    );

    console.log('[BackgroundFetch] Configured status:', status);
};

// Headless task for Android (runs even if app is terminated, if configured correctly in Native)
export const HeadlessTask = async (event: any) => {
    console.log('[BackgroundFetch] Headless Task:', event.taskId);
    await processQueue();
    BackgroundFetch.finish(event.taskId);
};
