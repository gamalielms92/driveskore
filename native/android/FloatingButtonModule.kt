// android/app/src/main/java/com/driveskore/app/FloatingButtonModule.kt

package com.driveskore.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule

class FloatingButtonModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    private var captureEventReceiver: BroadcastReceiver? = null

    init {
        registerCaptureEventReceiver()
    }

    override fun getName(): String {
        return "FloatingButton"
    }

    @ReactMethod
    fun checkPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val canDraw = Settings.canDrawOverlays(reactContext)
                promise.resolve(canDraw)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Error checking permission: ${e.message}")
        }
    }

    @ReactMethod
    fun requestPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(reactContext)) {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:${reactContext.packageName}")
                    ).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactContext.startActivity(intent)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun startFloatingButton(promise: Promise) {
        try {
            // Verificar permiso primero
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(reactContext)) {
                    promise.reject("PERMISSION_DENIED", "No permission to draw overlays")
                    return
                }
            }
            
            val intent = Intent(reactContext, FloatingButtonService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Error starting service: ${e.message}")
        }
    }

    @ReactMethod
    fun stopFloatingButton(promise: Promise) {
        try {
            val intent = Intent(reactContext, FloatingButtonService::class.java)
            reactContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Error stopping service: ${e.message}")
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        try {
            val manager = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as? android.app.ActivityManager
            
            manager?.let {
                val isRunning = it.getRunningServices(Integer.MAX_VALUE).any { service ->
                    FloatingButtonService::class.java.name == service.service.className
                }
                promise.resolve(isRunning)
            } ?: promise.resolve(false)
            
        } catch (e: Exception) {
            promise.reject("ERROR", "Error checking service: ${e.message}")
        }
    }

    private fun registerCaptureEventReceiver() {
        captureEventReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onFloatingButtonCapture", null)
            }
        }
        
        val filter = IntentFilter("com.driveskore.app.CAPTURE_EVENT")
        
        // ✅ CORRECCIÓN: Especificar RECEIVER_NOT_EXPORTED para Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(
                captureEventReceiver, 
                filter, 
                Context.RECEIVER_NOT_EXPORTED
            )
        } else {
            reactContext.registerReceiver(captureEventReceiver, filter)
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            captureEventReceiver?.let {
                reactContext.unregisterReceiver(it)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}