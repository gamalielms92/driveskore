package com.driveskore.app

import android.content.Context
import androidx.work.*
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.TimeUnit

class WorkManagerModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("WorkManager")

        AsyncFunction("scheduleLocationSync") { data: Map<String, Any> ->
            val workData = Data.Builder()
                .putString("supabase_url", data["supabaseUrl"] as? String)
                .putString("access_token", data["accessToken"] as? String)
                .putString("user_id", data["userId"] as? String)
                .putString("plate", data["plate"] as? String)
                .putString("session_id", data["sessionId"] as? String)
                .putDouble("latitude", data["latitude"] as? Double ?: 0.0)
                .putDouble("longitude", data["longitude"] as? Double ?: 0.0)
                .putDouble("accuracy", data["accuracy"] as? Double ?: 0.0)
                .putDouble("speed", data["speed"] as? Double ?: 0.0)
                .putDouble("heading", data["heading"] as? Double ?: 0.0)
                .putString("timestamp", data["timestamp"] as? String)
                .putString("anon_key", data["anonKey"] as? String)
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

            val workManager = WorkManager.getInstance(appContext.reactContext as Context)
            workManager.enqueue(workRequest)

            workRequest.id.toString()
        }

        AsyncFunction("cancelAllWork") {
            val workManager = WorkManager.getInstance(appContext.reactContext as Context)
            workManager.cancelAllWork()
        }
    }
}