import { useQueueStats } from '@/hooks/useQueueStats'
import { Cloud, Loader2, AlertCircle } from 'lucide-react'

export function UploadQueueIndicator() {
  const { total, failed, queued, uploading } = useQueueStats()

  if (total === 0) return null

  if (uploading > 0) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-background border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-sm text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
        <span>Uploading {uploading} item{uploading !== 1 ? 's' : ''}...</span>
      </div>
    )
  }

  if (failed > 0) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-destructive/10 border border-destructive/20 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>{failed} upload{failed !== 1 ? 's' : ''} failed</span>
      </div>
    )
  }

  if (queued > 0) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-background border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-sm text-foreground">
        <Cloud className="h-4 w-4" />
        <span>{queued} item{queued !== 1 ? 's' : ''} waiting to sync</span>
      </div>
    )
  }

  return null
}
