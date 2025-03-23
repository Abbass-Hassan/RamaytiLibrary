package com.ramaytilibraryapp

import android.content.Context
import android.util.Log
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager
import javax.net.ssl.HttpsURLConnection
import okhttp3.OkHttpClient

object SSLTrustManager {
    private const val TAG = "SSLTrustManager"
    
    // Create a single trust manager instance to be reused
    private val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
        override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
        override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
        override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
    })

    fun setupTrustAllCerts() {
        try {
            val sslContext = SSLContext.getInstance("TLS")
            // Initialize with our trust manager
            sslContext.init(null, trustAllCerts, java.security.SecureRandom())
            
            // Set the default socket factory for HttpsURLConnection
            HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.socketFactory)
            HttpsURLConnection.setDefaultHostnameVerifier { _, _ -> true }
            
            Log.d(TAG, "SSL Trust All setup complete")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up SSL Trust All: ${e.message}", e)
        }
    }

    fun createTrustAllOkHttpClient(): OkHttpClient {
        try {
            val sslContext = SSLContext.getInstance("TLS")
            sslContext.init(null, trustAllCerts, java.security.SecureRandom())
            
            // Cast the first trust manager to X509TrustManager
            val x509TrustManager = trustAllCerts[0] as X509TrustManager

            return OkHttpClient.Builder()
                .sslSocketFactory(sslContext.socketFactory, x509TrustManager)
                .hostnameVerifier { _, _ -> true }
                .build()
        } catch (e: Exception) {
            Log.e(TAG, "Error creating Trust All OkHttpClient: ${e.message}", e)
            return OkHttpClient()
        }
    }
}