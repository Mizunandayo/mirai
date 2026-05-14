import { useEffect, useRef, useState } from 'react'

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type WindowWithSpeech = Window & {
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
  SpeechRecognition?: new () => SpeechRecognitionLike
}

function toUserFriendlyError(raw: unknown): string {
  const code = String(raw || '').toLowerCase()

  if (code === 'network') {
    return 'Voice recognition service is unreachable. Check internet/browser privacy settings or use Text input.'
  }
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return 'Microphone access is blocked. Allow microphone permission in your browser and try again.'
  }
  if (code === 'audio-capture') {
    return 'No microphone was detected. Connect or enable a microphone device.'
  }
  if (code === 'no-speech') {
    return 'No speech detected. Try speaking closer to the microphone.'
  }
  if (code === 'aborted') {
    return 'Voice recording was interrupted. Please try again.'
  }
  if (code === 'bad-grammar' || code === 'language-not-supported') {
    return 'Speech recognition language configuration is unsupported in this browser.'
  }

  return code ? 'Voice recognition error: ' + code : 'Speech recognition error'
}

export function useVoiceToText() {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const w = window as WindowWithSpeech
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.continuous = true

    recognition.onresult = (event) => {
      let full = ''
      for (let i = 0; i < event.results.length; i += 1) {
        full += event.results[i][0].transcript
      }
      setTranscript(full.trim())
    }

    recognition.onerror = (event) => {
      setError(toUserFriendlyError(event?.error))
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      try {
        recognition.stop()
      } catch {
      }
    }
  }, [])

  function startListening(): boolean {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser')
      return false
    }
    setError('')
    setTranscript('')
    try {
      recognitionRef.current.start()
      setIsListening(true)
      return true
    } catch {
      setIsListening(false)
      setError('Unable to start voice recognition. Use Text input if this keeps happening.')
      return false
    }
  }

  function stopListening() {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
    setIsListening(false)
  }

  return {
    transcript,
    isListening,
    error,
    startListening,
    stopListening,
    clearTranscript: () => setTranscript(''),
  }
}