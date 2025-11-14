package com.driveskore.app

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL
import java.net.HttpURLConnection
import org.json.JSONObject

class LocationSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val supabaseUrl = inputData.getString("supabase_url") ?: return@withContext Result.failure()
            val accessToken = inputData.getString("access_token") ?: return@withContext Result.failure()
            val userId = inputData.getString("user_id") ?: return@withContext Result.failure()
            val plate = inputData.getString("plate") ?: return@withContext Result.failure()
            val sessionId = inputData.getString("session_id") ?: return@withContext Result.failure()
            val latitude = inputData.getDouble("latitude", 0.0)
            val longitude = inputData.getDouble("longitude", 0.0)
            val accuracy = inputData.getDouble("accuracy", 0.0)
            val speed = inputData.getDouble("speed", 0.0)
            val heading = inputData.getDouble("heading", 0.0)
            val timestamp = inputData.getString("timestamp") ?: return@withContext Result.failure()
            val anonKey = inputData.getString("anon_key") ?: return@withContext Result.failure()

            val payload = JSONObject().apply {
                put("user_id", userId)
                put("plate", plate)
                put("session_id", sessionId)
                put("latitude", latitude)
                put("longitude", longitude)
                put("location", "POINT($longitude $latitude)")
                put("accuracy", accuracy)
                put("speed", speed)
                put("heading", heading)
                put("bluetooth_mac_hash", "workmanager-task")
                put("captured_at", timestamp)
            }

            val url = URL("$supabaseUrl/rest/v1/driver_locations")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.apply {
                requestMethod = "POST"
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Authorization", "Bearer $accessToken")
                setRequestProperty("apikey", anonKey)
                setRequestProperty("Prefer", "return=minimal")
                connectTimeout = 15000
                readTimeout = 15000
            }

            connection.outputStream.use { os ->
                os.write(payload.toString().toByteArray())
            }

            val responseCode = connection.responseCode
            connection.disconnect()

            if (responseCode in 200..299) {
                Result.success()
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            Result.retry()
        }
    }
}