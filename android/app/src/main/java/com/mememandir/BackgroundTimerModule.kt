package com.mememandir

import android.app.*
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BackgroundTimerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val CHANNEL_ID = "backup_channel"
        private const val NOTIFICATION_ID = 12345
    }

    override fun getName(): String = "BackgroundTimer"

    @ReactMethod
    fun startForegroundService(
        title: String,
        message: String,
        channelId: String,
        channelName: String,
        promise: Promise
    ) {
        try {
            val serviceIntent = Intent(reactContext, BackupForegroundService::class.java).apply {
                putExtra("title", title)
                putExtra("message", message)
                putExtra("channelId", channelId)
                putExtra("channelName", channelName)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent)
            } else {
                reactContext.startService(serviceIntent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopForegroundService(promise: Promise) {
        try {
            val serviceIntent = Intent(reactContext, BackupForegroundService::class.java)
            reactContext.stopService(serviceIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message, e)
        }
    }
    @ReactMethod
fun updateNotification(message: String, progress: Int, promise: Promise) {
    try {
        val updateIntent = Intent(reactContext, BackupForegroundService::class.java).apply {
            action = "UPDATE_NOTIFICATION"
            putExtra("message", message)
            putExtra("progress", progress)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(updateIntent)
        } else {
            reactContext.startService(updateIntent)
        }

        promise.resolve(true)
    } catch (e: Exception) {
        promise.reject("UPDATE_ERROR", e.message, e)
    }
}
}
