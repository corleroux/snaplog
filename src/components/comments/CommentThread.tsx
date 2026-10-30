/**
 * Comment Thread Component
 *
 * Displays and manages comments for an entity.
 * Supports threaded replies, editing, and deleting.
 */

import { useState, useCallback, useEffect } from 'react'
import { MessageSquare, Reply, Edit2, Trash2, ChevronDown, Send } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MentionInput, type MentionUser } from './MentionInput'
import { useToast } from '@/components/ui/toast'
import { createLogger } from '@/lib/logger'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getEntityComments, getCommentReplies, createComment, updateComment, deleteComment, subscribeToEntityComments } from '@/features/comments/api/comments'

const log = createLogger('CommentThread')

export type CommentEntityType = 'vendor' | 'style' | 'variant' | 'event'

export interface CommentAuthor {
  id: string
  email: string
  fullName?: string
}

export interface Comment {
  id: string
  entityType: CommentEntityType
  entityId: string
  parentId: string | null
  content: string
  userId: string
  user: CommentAuthor
  mentionedUsers: string[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  replyCount?: number
  replies?: Comment[]
}

export interface CommentThreadProps {
  /** Type of entity being commented on */
  entityType: CommentEntityType
  /** ID of entity being commented on */
  entityId: string
  /** Available users to mention */
  availableUsers?: MentionUser[]
  /** Optional additional className */
  className?: string
  /** Whether to show the comment count */
  showCount?: boolean
  /** Placeholder text for new comment input */
  placeholder?: string
  /** Optional external reply loader (deprecated — handled internally) */
  onLoadReplies?: (commentId: string) => Promise<void>
}

interface CommentItemProps {
  comment: Comment
  currentUserId: string
  onReply: (commentId: string, content: string) => Promise<void>
  onEdit: (commentId: string, content: string) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
  onLoadReplies?: (commentId: string) => Promise<void>
  depth?: number
}

/**
 * Individual comment item with actions
 */
function CommentItem({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onLoadReplies,
  depth = 0
}: CommentItemProps) {
    const [isReplying, setIsReplying] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [replyContent, setReplyContent] = useState('')
    const [editContent, setEditContent] = useState(comment.content)
    const [isSubmitting, setIsSubmitting] = useState(false)

  const isOwnComment = comment.userId === currentUserId
  const isDeleted = !!comment.deletedAt

  const handleSubmitReply = useCallback(async () => {
    if (!replyContent.trim()) return

    setIsSubmitting(true)
    try {
      await onReply(comment.id, replyContent)
      setReplyContent('')
       setIsReplying(false)
    } catch (error) {
      log.error('Failed to reply', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setIsSubmitting(false)
    }
  }, [replyContent, onReply])

  const handleSubmitEdit = useCallback(async () => {
    if (!editContent.trim()) return

    setIsSubmitting(true)
    try {
      await onEdit(comment.id, editContent)
      setIsEditing(false)
    } catch (error) {
      log.error('Failed to edit', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setIsSubmitting(false)
    }
  }, [editContent, onEdit])

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this comment?')) return

    setIsSubmitting(true)
    try {
      await onDelete(comment.id)
    } catch (error) {
      log.error('Failed to delete', { error: error instanceof Error ? error.message : String(error) })
    } finally {
      setIsSubmitting(false)
    }
   }, [onDelete])



  const authorName = comment.user.fullName || comment.user.email.split('@')[0]
  const formattedDate = new Date(comment.createdAt).toLocaleDateString()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div
      className={cn(
        'space-y-3',
        depth > 0 && 'ml-8 pl-4 border-l-2 border-border'
      )}
    >
      <div className="flex gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
          {getInitials(authorName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{authorName}</span>
            <span className="text-muted-foreground">{formattedDate}</span>
            {isDeleted && (
              <span className="text-muted-foreground italic">(deleted)</span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitEdit}
                  disabled={isSubmitting || !editContent.trim()}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false)
                    setEditContent(comment.content)
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className={cn(
              'mt-1 text-sm',
              isDeleted && 'text-muted-foreground italic'
            )}>
              {comment.content}
            </p>
          )}

          {!isDeleted && !isEditing && (
            <div className="flex gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setIsReplying(!isReplying)}
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>

              {isOwnComment && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </>
              )}

               {(comment.replyCount ?? 0) > 0 && onLoadReplies && (
                 <Button
                   variant="ghost"
                   size="sm"
                   className="h-7 text-xs"
                   onClick={() => onLoadReplies(comment.id)}
                 >
                   <ChevronDown className="h-3 w-3 mr-1" />
                   {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                 </Button>
               )}
            </div>
          )}

          {isReplying && !isDeleted && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsReplying(false)
                    setReplyContent('')
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  )
}

/**
 * Comment Thread Component
 *
 * Main component for displaying and managing comments on an entity.
 */
export function CommentThread({
  entityType,
  entityId,
  availableUsers = [],
  className,
  showCount = true,
  placeholder = 'Write a comment...',
}: CommentThreadProps) {
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState('')
    const [mentionedUsers, setMentionedUsers] = useState<MentionUser[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { showToast } = useToast()

     const { user } = useAuth()
     const currentUserId = user?.id ?? ''

   // Load comments
   useEffect(() => {
     if (!entityType || !entityId) {
       setIsLoading(false)
       setError(null)
       return
     }

     const loadComments = async () => {
       setError(null)
       try {
         const comments = await getEntityComments(entityType, entityId)
         setComments(comments)
       } catch (error) {
         log.error('Failed to load comments', { error: error instanceof Error ? error.message : String(error) })
         setError('Failed to load comments')
         showToast({
           title: 'Failed to load comments',
           variant: 'error',
           duration: 5000
         })
       } finally {
         if (!cancelled) {
           setIsLoading(false)
         }
       }
     }

     let cancelled = false

     loadComments()

     // Subscribe to real-time comment updates
     const unsubscribe = subscribeToEntityComments(
       entityType,
       entityId,
       (newComment) => {
         setComments(prev => [newComment, ...prev])
       }
     )

     // Cleanup subscription on unmount or when entity changes
     return () => {
      cancelled = true
      unsubscribe()
     }
   }, [entityType, entityId])

   const handleSubmitComment = useCallback(async () => {
     if (!newComment.trim()) return

     setIsSubmitting(true)
      try {
        const comment = await createComment(
          entityType,
          entityId,
          newComment,
          undefined, // parentId
          mentionedUsers.map(u => u.id)
        )

       setComments([comment, ...comments])
       setNewComment('')
       setMentionedUsers([])

       showToast({
         title: 'Comment added',
         variant: 'success',
         duration: 3000
       })
     } catch (error) {
       log.error('Failed to submit comment', { error: error instanceof Error ? error.message : String(error) })
       showToast({
         title: 'Failed to add comment',
         variant: 'error',
         duration: 5000
       })
     } finally {
       setIsSubmitting(false)
     }
   }, [newComment, mentionedUsers, entityType, entityId, currentUserId, comments, showToast])

   const handleReply = useCallback(async (commentId: string, content: string) => {
     if (!content.trim()) return

     setIsSubmitting(true)
     try {
       const reply = await createComment(
         entityType,
         entityId,
         content,
         commentId, // parentId
         [] // mentionedUsers
       )

       setComments(comments.map(c => {
         if (c.id === commentId) {
           return {
             ...c,
             replyCount: (c.replyCount ?? 0) + 1,
             replies: [...(c.replies || []), reply]
           }
         }
         return c
       }))

       showToast({
         title: 'Reply added',
         variant: 'success',
         duration: 3000
       })
     } catch (error) {
       log.error('Failed to submit reply', { error: error instanceof Error ? error.message : String(error) })
       showToast({
         title: 'Failed to add reply',
         variant: 'error',
         duration: 5000
       })
     } finally {
       setIsSubmitting(false)
     }
   }, [entityType, entityId, currentUserId, comments, showToast])

   const handleEdit = useCallback(async (commentId: string, content: string) => {
     if (!content.trim()) return

     setIsSubmitting(true)
     try {
       const updatedComment = await updateComment(commentId, content)

       setComments(comments.map(c => {
         if (c.id === commentId) {
           return { ...c, ...updatedComment }
         }
         // Also check in replies
         if (c.replies) {
           return {
             ...c,
             replies: c.replies.map(r =>
               r.id === commentId ? { ...r, ...updatedComment } : r
             )
           }
         }
         return c
       }))
     } catch (error) {
       log.error('Failed to edit comment', { error: error instanceof Error ? error.message : String(error) })
       showToast({
         title: 'Failed to edit comment',
         variant: 'error',
         duration: 5000
       })
     } finally {
       setIsSubmitting(false)
     }
   }, [comments])

   const handleDelete = useCallback(async (commentId: string) => {
     if (!confirm('Delete this comment?')) return

     setIsSubmitting(true)
     try {
       await deleteComment(commentId)
       setComments(comments.filter(c => c.id !== commentId))
       showToast({
         title: 'Comment deleted',
         variant: 'success',
         duration: 3000
       })
     } catch (error) {
       log.error('Failed to delete comment', { error: error instanceof Error ? error.message : String(error) })
       showToast({
         title: 'Failed to delete comment',
         variant: 'error',
         duration: 5000
       })
     } finally {
       setIsSubmitting(false)
     }
   }, [comments, showToast])

   const handleLoadReplies = useCallback(async (commentId: string) => {
     try {
       const replies = await getCommentReplies(commentId)
       setComments(prev => prev.map(c =>
         c.id === commentId ? { ...c, replies } : c
       ))
     } catch (err) {
       log.error('Failed to load replies', { error: err instanceof Error ? err.message : String(err) })
     }
   }, [])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-semibold">
          Comments
          {showCount && (
            <span className="ml-2 text-muted-foreground font-normal">
              ({comments.length})
            </span>
          )}
        </h3>
      </div>

      {/* New comment input */}
      <div className="space-y-2">
        <MentionInput
          value={newComment}
          onChange={(value, users) => {
            setNewComment(value)
            setMentionedUsers(users)
          }}
          availableUsers={availableUsers}
          placeholder={placeholder}
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitComment}
            disabled={isSubmitting || !newComment.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </div>

       {/* Comments list */}
       {isLoading ? (
         <p className="text-sm text-muted-foreground">Loading comments...</p>
       ) : error ? (
         <p className="text-sm text-destructive">{error}</p>
       ) : comments.length === 0 ? (
         <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
       ) : (
         <div className="space-y-4">
           {comments.map((comment) => (
             <CommentItem
               key={comment.id}
               comment={comment}
               currentUserId={currentUserId}
               onReply={handleReply}
               onEdit={handleEdit}
               onDelete={handleDelete}
               onLoadReplies={handleLoadReplies}
             />
           ))}
         </div>
       )}
    </div>
  )
}
