package com.hiosdra.openanchor.service

import kotlinx.coroutines.flow.StateFlow

/**
 * Interface for binding to the anchor monitoring service.
 * Implementation lives in :app module (ServiceBinder).
 * Feature modules depend on this interface to avoid circular dependencies.
 */
interface ServiceBinderApi {
    val monitorState: StateFlow<MonitorState>

    fun startAndBind(sessionId: Long)
    fun stopMonitoring()
    fun dismissAlarm()
    fun muteAlarm()
    fun startWebSocketServer()
    fun stopWebSocketServer()
    fun startClientMode(wsUrl: String)
    fun stopClientMode()
    fun unbind()
}
