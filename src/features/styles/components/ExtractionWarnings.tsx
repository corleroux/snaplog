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
            className="flex items-start gap-2 p-3 bg-field-warn border border-danger rounded-lg"
          >
            <AlertTriangle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-danger">
              {typeof warning === 'string' ? warning : JSON.stringify(warning)}
            </p>
          </div>
        ))}
      </div>
    </SectionContainer>
  )
}
