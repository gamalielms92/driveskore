package com.driveskore.app

import android.content.Context
import androidx.work.*
import com.facebook.react.bridge.*
import java.util.concurrent.TimeUnit

class WorkManagerModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "WorkManager"

    @ReactMethod
    fun scheduleLocationSync(data: ReadableMap, promise: Promise) {
        try {
            val workData = Data.Builder()
                .putString("supabase_url", data.getString("supabaseUrl"))
                .putString("access_token", data.getString("accessToken"))
                .putString("user_id", data.getString("userId"))
                .putString("plate", data.getString("plate"))
                .putString("session_id", data.getString("sessionId"))
                .putDouble("latitude", data.getDouble("latitude"))
                .putDouble("longitude", data.getDouble("longitude"))
                .putDouble("accuracy", data.getDouble("accuracy"))
                .putDouble("speed", data.getDouble("speed"))
                .putDouble("heading", data.getDouble("heading"))
                .putString("timestamp", data.getString("timestamp"))
                .putString("anon_key", data.getString("anonKey"))
                .build()

            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = OneTimeWorkRequestBuilder<LocationSyncWorker>()
                .setInputData(workData)
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    10,
                    TimeUnit.SECONDS
                )
                .build()

            val workManager = WorkManager.getInstance(reactApplicationContext)
            workManager.enqueue(workRequest)

            promise.resolve(workRequest.id.toString())
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAllWork(promise: Promise) {
        try {
            val workManager = WorkManager.getInstance(reactApplicationContext)
            workManager.cancelAllWork()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message, e)
        }
    }
}