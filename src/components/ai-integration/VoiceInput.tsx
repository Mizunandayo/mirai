import { useRef } from 'react'
import { useAtom } from 'jotai'
import { voiceStateAtom } from '../../store/aiAtoms'
import { useVoiceToText } from '../../hooks/useVoiceToText'
import './voice-input.css'

type VoiceInputProps = {
  onTranscriptReady: (text: string) => void
}

export default function VoiceInput({ onTranscriptReady }: VoiceInputProps) {
  const [voiceState, setVoiceState] = useAtom(voiceStateAtom)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const {
    transcript,
    isListening,
    error,
    startListening,
    stopListening,
    clearTranscript,
  } = useVoiceToText()

  async function handleStart() {
    setVoiceState((prev) => ({ ...prev, error: undefined }))
    const started = startListening()
    setVoiceState((prev) => ({ ...prev, isRecording: started, error: started ? undefined : prev.error }))
    if (started) {
      drawIdleWave()
    }
  }

  function handleStopAndSubmit() {
    stopListening()
    setVoiceState((prev) => ({ ...prev, isRecording: false, transcript }))
    if (transcript && transcript.trim().length > 0) {
      onTranscriptReady(transcript.trim())
    }
  }

  function drawIdleWave() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d = canvas.getContext('2d')!

    const width = canvas.width
    const height = canvas.height
    let t = 0

    function draw() {
      if (!isListening) return

      ctx2d.fillStyle = '#ffffff'
      ctx2d.fillRect(0, 0, width, height)
      ctx2d.strokeStyle = '#0d0d0d'
      ctx2d.lineWidth = 2
      ctx2d.beginPath()

      const points = 64
      for (let i = 0; i < points; i += 1) {
        const x = (i / (points - 1)) * width
        const y = height / 2 + Math.sin(i * 0.45 + t) * 8
        if (i === 0) ctx2d.moveTo(x, y)
        else ctx2d.lineTo(x, y)
      }
      ctx2d.stroke()
      t += 0.12
      requestAnimationFrame(draw)
    }

    draw()
  }

  return (
    <div className='voice-input-panel'>
      <canvas ref={canvasRef} className='voice-waveform' width={320} height={64} />
      <div className='voice-controls'>
        {!isListening ? (
          <button className='voice-record-btn' onClick={handleStart}>
            <span>Start Recording</span>
          </button>
        ) : (
          <button className='voice-stop-btn' onClick={handleStopAndSubmit}>
            <span>Stop and Generate</span>
          </button>
        )}
      </div>

      {transcript && (
        <div className='voice-transcript'>
          <div className='voice-transcript-label'>Transcript</div>
          <div className='voice-transcript-text'>{transcript}</div>
          <button
            className='voice-clear-btn'
            onClick={() => {
              clearTranscript()
              setVoiceState((prev) => ({ ...prev, transcript: '' }))
            }}
          >
            <span>Clear</span>
          </button>
        </div>
      )}

      {(error || voiceState.error) && (
        <div className='voice-error'>{String(error || voiceState.error)}</div>
      )}
    </div>
  )
}