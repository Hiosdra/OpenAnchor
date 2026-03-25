package com.hiosdra.openanchor.service

import com.hiosdra.openanchor.domain.model.AlarmState
import javax.inject.Inject
import javax.inject.Singleton

data class AlarmTransitionResult(
    val shouldStartAlarm: Boolean,
    val shouldStopAlarm: Boolean,
    val shouldSendWearTrigger: Boolean,
    val shouldIncrementAlarmCount: Boolean
)

data class PairedAlarmEvent(
    val reason: String,
    val message: String,
    val alarmState: AlarmState
)

data class PairedAlarmResult(
    val shouldStartAlarm: Boolean,
    val shouldStopAlarm: Boolean,
    val shouldSendWearTrigger: Boolean,
    val newAlarmState: AlarmState,
    val notificationText: String,
    val gpsSignalLost: Boolean
)

sealed class ClientAlarmEvent {
    data class Connected(val serverUrl: String) : ClientAlarmEvent()
    data object Disconnected : ClientAlarmEvent()
    data object HeartbeatTimeout : ClientAlarmEvent()
    data object MuteCommand : ClientAlarmEvent()
    data object DismissCommand : ClientAlarmEvent()
}

data class ClientEventResult(
    val peerConnected: Boolean?,
    val alarmState: AlarmState?,
    val shouldStartAlarm: Boolean,
    val shouldStopAlarm: Boolean,
    val shouldSendWearTrigger: Boolean,
    val notificationText: String?
)

@Singleton
class AlarmHandler @Inject constructor() {

    fun handleAlarmTransition(
        newAlarmState: AlarmState,
        previousAlarmState: AlarmState,
        isAlarmPlaying: Boolean
    ): AlarmTransitionResult {
        return when (newAlarmState) {
            AlarmState.ALARM -> AlarmTransitionResult(
                shouldStartAlarm = !isAlarmPlaying,
                shouldStopAlarm = false,
                shouldSendWearTrigger = previousAlarmState != AlarmState.ALARM,
                shouldIncrementAlarmCount = !isAlarmPlaying
            )
            else -> AlarmTransitionResult(
                shouldStartAlarm = false,
                shouldStopAlarm = isAlarmPlaying,
                shouldSendWearTrigger = false,
                shouldIncrementAlarmCount = false
            )
        }
    }

    fun handlePairedAlarm(
        event: PairedAlarmEvent,
        previousAlarmState: AlarmState,
        isAlarmPlaying: Boolean
    ): PairedAlarmResult {
        return when (event.reason) {
            "GPS_LOST" -> PairedAlarmResult(
                shouldStartAlarm = !isAlarmPlaying,
                shouldStopAlarm = false,
                shouldSendWearTrigger = true,
                newAlarmState = AlarmState.ALARM,
                notificationText = "GPS lost on navigation station!",
                gpsSignalLost = true
            )
            "LOW_BATTERY" -> PairedAlarmResult(
                shouldStartAlarm = !isAlarmPlaying,
                shouldStopAlarm = false,
                shouldSendWearTrigger = true,
                newAlarmState = AlarmState.WARNING,
                notificationText = "Tablet battery critical! ${event.message}",
                gpsSignalLost = false
            )
            "WATCH_TIMER" -> PairedAlarmResult(
                shouldStartAlarm = !isAlarmPlaying,
                shouldStopAlarm = false,
                shouldSendWearTrigger = true,
                newAlarmState = previousAlarmState,
                notificationText = "Watch timer: ${event.message}",
                gpsSignalLost = false
            )
            else -> {
                when (event.alarmState) {
                    AlarmState.ALARM -> PairedAlarmResult(
                        shouldStartAlarm = !isAlarmPlaying,
                        shouldStopAlarm = false,
                        shouldSendWearTrigger = previousAlarmState != AlarmState.ALARM,
                        newAlarmState = AlarmState.ALARM,
                        notificationText = "ALARM: ${event.message}",
                        gpsSignalLost = false
                    )
                    AlarmState.WARNING -> PairedAlarmResult(
                        shouldStartAlarm = false,
                        shouldStopAlarm = isAlarmPlaying,
                        shouldSendWearTrigger = false,
                        newAlarmState = AlarmState.WARNING,
                        notificationText = "ALARM: ${event.message}",
                        gpsSignalLost = false
                    )
                    else -> PairedAlarmResult(
                        shouldStartAlarm = false,
                        shouldStopAlarm = isAlarmPlaying,
                        shouldSendWearTrigger = false,
                        newAlarmState = event.alarmState,
                        notificationText = "ALARM: ${event.message}",
                        gpsSignalLost = false
                    )
                }
            }
        }
    }

    fun handleClientEvent(
        event: ClientAlarmEvent,
        isAlarmPlaying: Boolean
    ): ClientEventResult {
        return when (event) {
            is ClientAlarmEvent.Connected -> ClientEventResult(
                peerConnected = true,
                alarmState = null,
                shouldStartAlarm = false,
                shouldStopAlarm = false,
                shouldSendWearTrigger = false,
                notificationText = "Connected to server"
            )
            is ClientAlarmEvent.Disconnected -> ClientEventResult(
                peerConnected = false,
                alarmState = null,
                shouldStartAlarm = false,
                shouldStopAlarm = false,
                shouldSendWearTrigger = false,
                notificationText = "Disconnected — reconnecting..."
            )
            is ClientAlarmEvent.HeartbeatTimeout -> ClientEventResult(
                peerConnected = false,
                alarmState = AlarmState.ALARM,
                shouldStartAlarm = true,
                shouldStopAlarm = false,
                shouldSendWearTrigger = true,
                notificationText = "Connection lost with server!"
            )
            is ClientAlarmEvent.MuteCommand -> ClientEventResult(
                peerConnected = null,
                alarmState = null,
                shouldStartAlarm = false,
                shouldStopAlarm = isAlarmPlaying,
                shouldSendWearTrigger = false,
                notificationText = null
            )
            is ClientAlarmEvent.DismissCommand -> ClientEventResult(
                peerConnected = null,
                alarmState = AlarmState.SAFE,
                shouldStartAlarm = false,
                shouldStopAlarm = isAlarmPlaying,
                shouldSendWearTrigger = false,
                notificationText = null
            )
        }
    }
}
