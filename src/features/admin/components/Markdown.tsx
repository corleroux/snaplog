import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { sanitizeMarkdown } from '@/lib/security'

interface MarkdownProps {
  children: string
  className?: string
}

export function Markdown({ children, className }: MarkdownProps) {
  const sanitized = sanitizeMarkdown(children)

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          ),
        }}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  )
}