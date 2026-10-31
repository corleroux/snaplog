/**
 * Rack video capture screen (FR-VID client entry point).
 *
 * Minimal flow: pick an mp4/mov → upload → hand to the async pipeline →
 * poll the job until it completes or fails. Isolated items land in their
 * own scan sessions and go through the normal review/commit path.
 */

import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button, AppFrame, AppHeader } from '@/components/ui'
import { SectionContainer } from '@/components/ui/section-container'
import { useToast } from '@/components/ui/toast'
import {
  startVideoJob,
  pollVideoJob,
  type VideoJob,
} from '@/features/video/api/processVideo'

export interface VideoCaptureScreenProps {
  eventId: string
  vendorId: string
  className?: string
}

type Phase = 'idle' | 'uploading' | 'polling' | 'done' | 'error'

export function VideoCaptureScreen({ eventId, vendorId, className }: VideoCaptureScreenProps) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [job, setJob] = useState<VideoJob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) {return}
    setPhase('uploading')
    setError(null)

    try {
      const { jobId } = await startVideoJob({ eventId, vendorId, file })
      setPhase('polling')
      const finished = await pollVideoJob(jobId)
      setJob(finished)
      setPhase('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Video processing failed'
      setError(message)
      setPhase('error')
      showToast({ title: 'Video processing failed', description: message, variant: 'error', duration: 5000 })
    }
  }

  return (
    <AppFrame className={className}>
      <AppHeader
        title="Rack Video"
        subtitle="Walk the rail — items are isolated automatically"
      />

      <main className="px-4 py-6 pb-safe-offset space-y-4">
        <SectionContainer
          title="Capture a rack walk"
          description="MP4 or MOV, up to 200 MB. Processing runs in the background."
          background="muted"
        >
          {(phase === 'idle' || phase === 'error') && (
            <Button
              variant="accent"
              type="button"
              radius="pill"
              size="lg"
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              <Video className="h-5 w-5 mr-2" />
              Choose Video
            </Button>
          )}

          {(phase === 'uploading' || phase === 'polling') && (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              <p className="text-sm text-muted-foreground">
                {phase === 'uploading' ? 'Uploading video…' : 'Isolating items… this can take a few minutes.'}
              </p>
            </div>
          )}

          {phase === 'done' && job && (
            <div className="space-y-3 py-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Found {job.items_found} item{job.items_found === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-muted-foreground">
                Isolated items are extracted individually and appear for review and commit as usual.
              </p>
              <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={() => navigate(`/events/${eventId}/vendors/${vendorId}`)}
              >
                Back to Vendor
              </Button>
            </div>
          )}

          {phase === 'error' && error && (
            <p className="flex items-start gap-2 text-sm text-destructive pt-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </p>
          )}
        </SectionContainer>

        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,.mp4,.mov"
          style={{ display: 'none' }}
          tabIndex={-1}
          onChange={(e) => {
            void handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </main>
    </AppFrame>
  )
}
