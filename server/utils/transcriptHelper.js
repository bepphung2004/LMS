import { YoutubeTranscript } from 'youtube-transcript'

const MAX_TRANSCRIPT_LENGTH = 8000

const extractVideoId = (url = '') => {
  const normalized = String(url).trim()
  if (!normalized) return ''

  if (/^[a-zA-Z0-9_-]{11}$/.test(normalized)) {
    return normalized
  }

  try {
    const parsed = new URL(normalized)
    const host = parsed.hostname.replace('www.', '')

    if (['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      return (
        parsed.searchParams.get('v')
        || parsed.pathname.split('/').filter(Boolean).pop()
        || ''
      )
    }

    if (['youtu.be', 'youtube-nocookie.com'].includes(host)) {
      return parsed.pathname.split('/').filter(Boolean)[0] || ''
    }
  } catch {
    return normalized.split('/').pop()?.split('?')[0] || ''
  }

  return ''
}


export const fetchYouTubeTranscript = async (videoUrl) => {
  try {
    const videoId = extractVideoId(videoUrl)
    if (!videoId) return ''

    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: 'vi'
    }).catch(() =>
      YoutubeTranscript.fetchTranscript(videoId)
    )

    if (!Array.isArray(transcriptItems) || transcriptItems.length === 0) {
      return ''
    }

    const fullText = transcriptItems
      .map(item => item.text || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (fullText.length > MAX_TRANSCRIPT_LENGTH) {
      return fullText.slice(0, MAX_TRANSCRIPT_LENGTH) + '...'
    }

    return fullText
  } catch (error) {
    console.warn(`[TranscriptHelper] Could not fetch transcript for ${videoUrl}:`, error.message)
    return ''
  }
}


export const populateTranscripts = async (courseContent = []) => {
  let populated = 0

  for (const chapter of courseContent) {
    if (!Array.isArray(chapter.chapterContent)) continue

    for (const lecture of chapter.chapterContent) {
      if (lecture.lectureContent && lecture.lectureContent.trim().length > 0) continue
      if (!lecture.lectureUrl) continue

      const transcript = await fetchYouTubeTranscript(lecture.lectureUrl)
      if (transcript) {
        lecture.lectureContent = transcript
        populated += 1
      }
    }
  }

  return populated
}
