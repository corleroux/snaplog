import { AlertTriangle } from 'lucide-react'
import { SectionContainer } from '@/components/ui/section-container'

interface ExtractionWarningsProps {
  warnings: string[] | null | undefined
}

export function ExtractionWarnings({ warnings }: ExtractionWarningsProps) {
  if (!warnings || !Array.isArray(warnings) || warnings.length === 0) {
    return null
  }

  return (
    <SectionContainer
      title="Extraction Notes"
      background="muted"
    >
      <div className="space-y-2">
        {warnings.map((warning, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {typeof warning === 'string' ? warning : JSON.stringify(warning)}
            </p>
          </div>
        ))}
      </div>
    </SectionContainer>
  )
}
