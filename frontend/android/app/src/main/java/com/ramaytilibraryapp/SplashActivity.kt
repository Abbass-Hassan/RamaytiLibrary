package com.ramaytilibraryapp

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.animation.AnimationUtils
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class SplashActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)
        
        // Initialize views
        val logoImage = findViewById<ImageView>(R.id.splash_logo)
        val appNameText = findViewById<TextView>(R.id.app_name_text)
        val loadingSpinner = findViewById<ProgressBar>(R.id.loading_spinner)
        
        // Load animations
        val scaleAnimation = AnimationUtils.loadAnimation(this, R.anim.scale_animation)
        val fadeInAnimation = AnimationUtils.loadAnimation(this, R.anim.fade_in)
        
        // Start logo animation
        logoImage.startAnimation(scaleAnimation)
        
        // Delayed text and spinner appearance
        Handler(Looper.getMainLooper()).postDelayed({
            appNameText.alpha = 1f
            appNameText.startAnimation(fadeInAnimation)
            
            loadingSpinner.alpha = 1f
            loadingSpinner.startAnimation(fadeInAnimation)
        }, 700)
        
        // Transition to main activity
        Handler(Looper.getMainLooper()).postDelayed({
            val intent = Intent(this, MainActivity::class.java)
            startActivity(intent)
            
            // Add a nice transition animation
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            finish()
        }, 2500) // Extended to 2.5 seconds to accommodate animations
    }
}