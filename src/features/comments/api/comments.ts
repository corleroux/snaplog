/**
 * Comments API Functions
 *
 * Functions for managing comments on entities.
 */

import { supabase } from '@/lib/supabase/client'
import type { CommentEntityType, Comment } from '@/components/comments/CommentThread'

/**
 * Convert database comment to Comment type
 */
function fromDbComment(db: any): Comment {
  return {
    id: db.id,
    entityType: db.entity_type as CommentEntityType,
    entityId: db.entity_id,
    parentId: db.parent_id,
    content: db.content,
    userId: db.user_id,
    user: {
      id: db.user_id,
      email: db.user_email,
      fullName: db.user_full_name
    },
    mentionedUsers: db.mentioned_users || [],
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    deletedAt: db.deleted_at,
    replyCount: db.reply_count || 0
  }
}

/**
 * Get comments for an entity
 */
export async function getEntityComments(
  entityType: CommentEntityType,
  entityId: string,
  includeDeleted = false
): Promise<Comment[]> {
  const { data, error } = await supabase.rpc('get_entity_comments', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_include_deleted: includeDeleted
  })

  if (error) throw error
  return (data || []).map(fromDbComment)
}

/**
 * Get replies for a comment
 */
export async function getCommentReplies(
  commentId: string,
  includeDeleted = false
): Promise<Comment[]> {
  const { data, error } = await supabase.rpc('get_comment_replies', {
    p_comment_id: commentId,
    p_include_deleted: includeDeleted
  })

  if (error) throw error
  return (data || []).map(fromDbComment)
}

/**
 * Create a new comment
 */
export async function createComment(
  entityType: CommentEntityType,
  entityId: string,
  content: string,
  parentId?: string,
  mentionedUsers: string[] = []
): Promise<Comment> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('comments')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      parent_id: parentId || null,
      content,
      mentioned_users: mentionedUsers
    })
    .select()
    .single()

  if (error) throw error

  return fromDbComment({
    ...data,
    user_email: user.email,
    user_full_name: user.user_metadata?.full_name
  })
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  content: string
): Promise<Comment> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('comments')
    .update({ content })
    .eq('id', commentId)
    .select()
    .single()

  if (error) throw error

  return fromDbComment({
    ...data,
    user_email: user.email,
    user_full_name: user.user_metadata?.full_name
  })
}

/**
 * Soft delete a comment
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)

  if (error) throw error
}

/**
 * Subscribe to comments for an entity
 */
export function subscribeToEntityComments(
  entityType: CommentEntityType,
  entityId: string,
  callback: (comment: Comment) => void
): () => void {
  const channel = supabase
    .channel(`comments:${entityType}:${entityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `entity_type=eq.${entityType}&entity_id=eq.${entityId}`
      },
      async (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          callback(fromDbComment(payload.new))
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
