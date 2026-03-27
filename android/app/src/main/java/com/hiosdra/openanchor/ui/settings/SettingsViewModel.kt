package com.hiosdra.openanchor.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hiosdra.openanchor.data.preferences.PreferencesManager
import com.hiosdra.openanchor.data.preferences.UserPreferences
import com.hiosdra.openanchor.domain.model.DepthUnit
import com.hiosdra.openanchor.domain.model.DistanceUnit
import com.hiosdra.openanchor.ui.theme.ThemeMode
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val preferencesManager: PreferencesManager
) : ViewModel() {

    val preferences: StateFlow<UserPreferences> = preferencesManager.preferences
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), UserPreferences())

    fun setDistanceUnit(unit: DistanceUnit) {
        viewModelScope.launch { preferencesManager.setDistanceUnit(unit) }
    }

    fun setDepthUnit(unit: DepthUnit) {
        viewModelScope.launch { preferencesManager.setDepthUnit(unit) }
    }

    fun setLanguage(language: String) {
        viewModelScope.launch { preferencesManager.setLanguage(language) }
    }

    fun setGpsInterval(seconds: Int) {
        viewModelScope.launch { preferencesManager.setGpsInterval(seconds) }
    }

    fun setThemeMode(mode: ThemeMode) {
        viewModelScope.launch { preferencesManager.setThemeMode(mode) }
    }
}
