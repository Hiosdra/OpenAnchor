package com.hiosdra.openanchor.service

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages the binding lifecycle to [AnchorMonitorService].
 * Extracts Android-framework coupling out of ViewModels.
 */
@Singleton
class ServiceBinder @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private var service: AnchorMonitorService? = null
    private var bound = false

    private val _serviceInstance = MutableStateFlow<AnchorMonitorService?>(null)
    val serviceInstance: StateFlow<AnchorMonitorService?> = _serviceInstance.asStateFlow()

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
            val localBinder = binder as AnchorMonitorService.LocalBinder
            service = localBinder.getService()
            bound = true
            _serviceInstance.value = service
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            service = null
            bound = false
            _serviceInstance.value = null
        }
    }

    fun startAndBind(sessionId: Long) {
        val intent = AnchorMonitorService.startIntent(context, sessionId)
        context.startForegroundService(intent)
        context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
    }

    fun stopMonitoring() {
        service?.stopMonitoring()
        unbind()
    }

    fun dismissAlarm() {
        service?.dismissAlarm()
    }

    fun unbind() {
        if (bound) {
            context.unbindService(connection)
            bound = false
            service = null
            _serviceInstance.value = null
        }
    }
}
