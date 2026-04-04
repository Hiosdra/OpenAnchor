package com.hiosdra.openanchor.domain.result

/**
 * A common result type for operations that can succeed or fail.
 *
 * Prefer this over throwing exceptions for expected failure cases,
 * and over returning nullable types when the caller needs error details.
 *
 * Usage:
 * ```
 * fun exportGpx(): AppResult<Uri> = try {
 *     val uri = doExport()
 *     AppResult.Success(uri)
 * } catch (e: Exception) {
 *     AppResult.Failure(e.message ?: "Export failed", e)
 * }
 *
 * when (val result = exportGpx()) {
 *     is AppResult.Success -> share(result.data)
 *     is AppResult.Failure -> showError(result.message)
 * }
 * ```
 */
sealed class AppResult<out T> {
    data class Success<T>(val data: T) : AppResult<T>()
    data class Failure(val message: String, val cause: Throwable? = null) : AppResult<Nothing>()

    val isSuccess: Boolean get() = this is Success
    val isFailure: Boolean get() = this is Failure

    fun getOrNull(): T? = when (this) {
        is Success -> data
        is Failure -> null
    }

    fun exceptionOrNull(): Throwable? = when (this) {
        is Success -> null
        is Failure -> cause
    }

    inline fun <R> map(transform: (T) -> R): AppResult<R> = when (this) {
        is Success -> Success(transform(data))
        is Failure -> this
    }

    inline fun onSuccess(action: (T) -> Unit): AppResult<T> {
        if (this is Success) action(data)
        return this
    }

    inline fun onFailure(action: (message: String, cause: Throwable?) -> Unit): AppResult<T> {
        if (this is Failure) action(message, cause)
        return this
    }
}

/**
 * Wraps a suspending block into an [AppResult], catching any exception.
 */
inline fun <T> runCatchingResult(block: () -> T): AppResult<T> = try {
    AppResult.Success(block())
} catch (e: Exception) {
    AppResult.Failure(e.message ?: "Unknown error", e)
}
