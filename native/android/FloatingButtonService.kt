// android/app/src/main/java/com/driveskore/app/FloatingButtonService.kt

package com.driveskore.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import androidx.core.app.NotificationCompat
import kotlin.math.abs

class FloatingButtonService : Service() {
    
    private lateinit var windowManager: WindowManager
    private var floatingView: View? = null
    private var buttonImage: ImageView? = null
    private lateinit var params: WindowManager.LayoutParams
    
    private var initialX = 0f
    private var initialY = 0f
    private var initialTouchX = 0f
    private var initialTouchY = 0f
    private var isMoving = false
    
    companion object {
        private const val CHANNEL_ID = "FloatingButtonChannel"
        private const val NOTIFICATION_ID = 1001
        private const val MAX_CLICK_DURATION = 200L
        private const val CLICK_THRESHOLD = 10f
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (floatingView == null) {
            initializeFloatingButton()
        }
        return START_STICKY // Reiniciar automáticamente si el sistema mata el servicio
    }

    private fun initializeFloatingButton() {
        try {
            // Obtener WindowManager
            windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
            
            // Crear la vista del botón
            floatingView = createButtonView()
            
            // Configurar parámetros del overlay
            val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            }
            
            params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
            ).apply {
                // Posición inicial (esquina derecha, centro vertical)
                gravity = Gravity.TOP or Gravity.START
                x = resources.displayMetrics.widthPixels - 100
                y = resources.displayMetrics.heightPixels / 2
            }
            
            // Añadir vista al WindowManager
            windowManager.addView(floatingView, params)
            
            // Configurar interacciones
            setupButtonInteractions()
            
            // Animación de entrada
            animateEntrance()
            
        } catch (e: Exception) {
            e.printStackTrace()
            stopSelf()
        }
    }

    private fun createButtonView(): View {
        // Crear contenedor
        val container = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                dpToPx(60),
                dpToPx(60)
            )
        }
        
        // Crear ImageView del botón
        buttonImage = ImageView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                dpToPx(60),
                dpToPx(60)
            )
            scaleType = ImageView.ScaleType.CENTER
            elevation = dpToPx(10).toFloat()
            
            // Crear drawable circular
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#007AFF")) // Azul iOS
                setStroke(dpToPx(2), Color.WHITE)
            }
            
            // Icono placeholder (puedes cambiarlo por un drawable real)
            setImageDrawable(createCameraIcon())
        }
        
        container.addView(buttonImage)
        return container
    }

    private fun createCameraIcon(): android.graphics.drawable.Drawable {
        return android.graphics.drawable.ShapeDrawable(
            android.graphics.drawable.shapes.OvalShape()
        ).apply {
            paint.color = Color.WHITE
        }
    }

    private fun setupButtonInteractions() {
        var pressStartTime = 0L
        
        floatingView?.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    // Guardar posición inicial
                    pressStartTime = System.currentTimeMillis()
                    initialX = params.x.toFloat()
                    initialY = params.y.toFloat()
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    isMoving = false
                    
                    // Feedback visual
                    animatePress(true)
                    true
                }
                
                MotionEvent.ACTION_MOVE -> {
                    // Calcular nueva posición
                    val deltaX = (event.rawX - initialTouchX).toInt()
                    val deltaY = (event.rawY - initialTouchY).toInt()
                    
                    // Si se mueve más del threshold, es un arrastre
                    if (abs(deltaX.toFloat()) > CLICK_THRESHOLD || 
                        abs(deltaY.toFloat()) > CLICK_THRESHOLD) {
                        isMoving = true
                        params.x = initialX.toInt() + deltaX
                        params.y = initialY.toInt() + deltaY
                        windowManager.updateViewLayout(floatingView, params)
                    }
                    true
                }
                
                MotionEvent.ACTION_UP -> {
                    // Restaurar tamaño
                    animatePress(false)
                    
                    // Detectar clic vs arrastre
                    val pressDuration = System.currentTimeMillis() - pressStartTime
                    
                    if (!isMoving && pressDuration < MAX_CLICK_DURATION) {
                        // Es un CLIC - Capturar evento
                        handleCaptureClick()
                    } else if (isMoving) {
                        // Es un ARRASTRE - Ajustar a borde
                        snapToEdge()
                    }
                    true
                }
                
                else -> false
            }
        }
    }

    private fun animatePress(pressed: Boolean) {
        val scale = if (pressed) 0.85f else 1.0f
        buttonImage?.animate()
            ?.scaleX(scale)
            ?.scaleY(scale)
            ?.setDuration(100)
            ?.start()
    }

    private fun animateEntrance() {
        floatingView?.apply {
            alpha = 0f
            scaleX = 0.3f
            scaleY = 0.3f
            
            animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(300)
                .start()
        }
    }

    private fun handleCaptureClick() {
        // Enviar broadcast a React Native
        val intent = Intent("com.driveskore.app.CAPTURE_EVENT")
        sendBroadcast(intent)
        
        // Feedback visual - animación de pulso
        buttonImage?.let { button ->
            button.animate()
                .scaleX(1.3f)
                .scaleY(1.3f)
                .setDuration(100)
                .withEndAction {
                    button.animate()
                        .scaleX(1.0f)
                        .scaleY(1.0f)
                        .setDuration(100)
                        .start()
                }
                .start()
            
            // Cambiar color temporalmente a verde
            button.background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#34C759")) // Verde
                setStroke(dpToPx(2), Color.WHITE)
            }
            
            // Volver al color original después de 500ms
            button.postDelayed({
                button.background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(Color.parseColor("#007AFF"))
                    setStroke(dpToPx(2), Color.WHITE)
                }
            }, 500)
        }
    }

    private fun snapToEdge() {
        val screenWidth = resources.displayMetrics.widthPixels
        val screenHeight = resources.displayMetrics.heightPixels
        val buttonWidth = floatingView?.width ?: 0
        val buttonHeight = floatingView?.height ?: 0
        
        // Calcular borde más cercano (izquierda o derecha)
        val finalX = if (params.x < screenWidth / 2) 0 else screenWidth - buttonWidth
        
        // Limitar Y para que no se salga de la pantalla
        val finalY = params.y.coerceIn(0, screenHeight - buttonHeight)
        
        // Animar el movimiento al borde
        floatingView?.animate()
            ?.translationX((finalX - params.x).toFloat())
            ?.translationY((finalY - params.y).toFloat())
            ?.setDuration(200)
            ?.withEndAction {
                params.x = finalX
                params.y = finalY
                floatingView?.translationX = 0f
                floatingView?.translationY = 0f
                windowManager.updateViewLayout(floatingView, params)
            }
            ?.start()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Botón Flotante DriveSkore",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Botón de captura rápida de eventos"
                setShowBadge(false)
            }
            
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🎯 DriveSkore Activo")
            .setContentText("Botón flotante listo para capturar eventos")
            .setSmallIcon(android.R.drawable.ic_menu_camera) // Icono temporal
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }

    override fun onDestroy() {
        super.onDestroy()
        floatingView?.let { view ->
            // Animación de salida
            view.animate()
                .alpha(0f)
                .scaleX(0.3f)
                .scaleY(0.3f)
                .setDuration(200)
                .withEndAction {
                    try {
                        windowManager.removeView(view)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                .start()
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}
