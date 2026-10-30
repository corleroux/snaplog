import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const toastVariants = cva(
  'flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-in slide-in-from-top-2 duration-300',
  {
    variants: {
      variant: {
        success: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
        error: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
        warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
        info: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
        default: 'bg-background border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string
  description?: string
  showClose?: boolean
  onClose?: () => void
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  default: Info,
}

export function Toast({
  title,
  description,
  variant = 'default',
  showClose = true,
  onClose,
  className,
  ...props
}: ToastProps) {
  const Icon = iconMap[variant || 'default']

  return (
    <div className={cn(toastVariants({ variant }), className)} {...props}>
      {variant !== 'default' && (
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className="text-sm font-semibold text-foreground">{title}</p>
        )}
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {showClose && onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// Toast Provider Context for managing toasts
interface ToastItem {
  id: string
  title?: string
  description?: string
  variant?: VariantProps<typeof toastVariants>['variant']
  duration?: number
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const showToast = React.useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast = { ...toast, id }
      setToasts((prev) => [...prev, newToast])

      if (toast.duration !== Infinity) {
        setTimeout(() => {
          removeToast(id)
        }, toast.duration || 5000)
      }
    },
    []
  )

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Container - z-toast (z-70) */}
      <div className="z-toast fixed top-4 right-4 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              title={toast.title}
              description={toast.description}
              variant={toast.variant}
              showClose
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
