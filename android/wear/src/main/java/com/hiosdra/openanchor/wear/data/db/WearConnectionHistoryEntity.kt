package com.hiosdra.openanchor.wear.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "connection_history")
data class WearConnectionHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val phoneNodeId: String,
    val phoneDisplayName: String,
    val connectedAt: Long,
    val disconnectedAt: Long? = null
)
