import {
  AI_BUSY_MESSAGE,
  createGenAIClient,
  extractGenAIText,
  isRateLimitError,
  sleep
} from './genaiHelper.js'

export const GEMINI_FALLBACK_MODELS = ['gemini-3-flash-preview', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']
const GEMINI_RETRY_ATTEMPTS = 2
const GEMINI_RETRY_DELAY_MS = 1500

export const isModelNotFoundError = (error) => {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('not found')
    || message.includes('is not supported for generatecontent')
    || message.includes('models/')
}

export const isTemporarilyUnavailableError = (error) => {
  const status = Number(error?.status || error?.code || 0)
  const message = String(error?.message || '').toLowerCase()
  return status === 503
    || message.includes('503')
    || message.includes('unavailable')
    || message.includes('high demand')
    || message.includes('overloaded')
}

export const callGeminiWithFallback = async ({ apiKey, prompt, systemPrompt = '', logPrefix = 'AI' }) => {
  if (!apiKey) {
    throw new Error('Thiếu GEMINI_API_KEY trong .env. Vui lòng cấu hình để sử dụng tính năng AI.')
  }

  const ai = createGenAIClient(apiKey)
  const models = GEMINI_FALLBACK_MODELS
  const composedPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
  let lastErrorMessage = 'Unknown Gemini error'
  let encounteredBusyState = false

  console.log(`[${logPrefix}] Gemini models configured: ${models.join(', ')}`)

  for (const model of models) {
    console.log(`[${logPrefix}] Calling Gemini model: ${model}`)

    for (let attempt = 1; attempt <= GEMINI_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: composedPrompt
        })
        const text = extractGenAIText(response)
        if (text) return text
        lastErrorMessage = `Gemini model ${model} returned empty content`
      } catch (error) {
        lastErrorMessage = error.message || `Gemini model ${model} failed`

        if (isModelNotFoundError(error)) {
          console.warn(`[${logPrefix}] Model ${model} unavailable, trying next model`)
          break
        }

        if (isTemporarilyUnavailableError(error) || isRateLimitError(error)) {
          encounteredBusyState = true
          console.warn(`[${logPrefix}] Model ${model} busy, attempt ${attempt}/${GEMINI_RETRY_ATTEMPTS}`)
          await sleep(GEMINI_RETRY_DELAY_MS * attempt)
          continue
        }

        console.warn(`[${logPrefix}] Failed model ${model}: ${lastErrorMessage}`)
        break
      }
    }
  }

  if (encounteredBusyState) {
    throw new Error(AI_BUSY_MESSAGE)
  }

  throw new Error(lastErrorMessage || 'Không thể tạo phản hồi từ Gemini')
}
