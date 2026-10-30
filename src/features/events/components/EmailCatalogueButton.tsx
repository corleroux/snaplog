/**
 * Email Catalogue Button Component
 *
 * Button component for emailing catalogues.
 */

import { useState } from 'react'
import { Mail, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { sendCatalogueEmail } from '@/features/events/api/emailCatalogue'

interface EmailCatalogueButtonProps {
  eventId: string
  eventName?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

/**
 * Button to email a catalogue
 */
export function EmailCatalogueButton({
  eventId,
  eventName = 'Catalogue',
  variant = 'default',
  size = 'default',
  className = '',
}: EmailCatalogueButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [toEmail, setToEmail] = useState('')
  const [subject, setSubject] = useState(`Snaplog: ${eventName}`)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!toEmail) {
      setError('Please enter an email address')
      return
    }

    setIsSending(true)
    setError(null)

    try {
      await sendCatalogueEmail(eventId, {
        to: toEmail,
        subject: subject || undefined,
        message: message || undefined,
      })

      setSent(true)
      setTimeout(() => {
        setIsOpen(false)
        setSent(false)
        setToEmail('')
        setMessage('')
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send email'
      setError(message)
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setSent(false)
    setError(null)
  }

  const footer = (
    <div className="flex justify-between">
      <Button variant="outline" onClick={handleClose} disabled={isSending || sent}>
        Cancel
      </Button>
      <Button onClick={handleSend} disabled={isSending || sent || !toEmail}>
        {isSending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : sent ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Sent!
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send
          </>
        )}
      </Button>
    </div>
  )

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <Mail className="mr-2 h-4 w-4" />
        Email
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Email Catalogue"
        description="Send this catalogue via email."
        footer={footer}
        size="md"
      >
        <div className="space-y-4">
          {sent ? (
            <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Email sent successfully!
              </span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  type="email"
                  placeholder="recipient@example.com"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  )
}
