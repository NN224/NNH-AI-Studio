'use client';

import { memo } from 'react';
import { FileText, Calendar, Gift, Image as ImageIcon, MapPin, Clock, CheckCircle, XCircle, Send, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { GMBPost } from '@/lib/types/database';

interface PostCardProps {
  post: GMBPost & { location_name?: string };
  isSelected?: boolean;
  isCheckboxSelected?: boolean;
  onClick?: () => void;
  onCheckboxChange?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPublish?: () => void;
}

const POST_TYPE_ICONS = {
  whats_new: FileText,
  event: Calendar,
  offer: Gift,
  product: ImageIcon,
};

const POST_TYPE_LABELS = {
  whats_new: "What's New",
  event: 'Event',
  offer: 'Offer',
  product: 'Product',
};

const STATUS_COLORS = {
  published: 'bg-green-500/20 text-green-400 border-green-500/30',
  draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  queued: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
} as const;

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

export const PostCard = memo(function PostCard({
  post,
  isSelected,
  isCheckboxSelected,
  onClick,
  onCheckboxChange,
  onEdit,
  onDelete,
  onPublish,
}: PostCardProps) {
  const PostTypeIcon = POST_TYPE_ICONS[post.post_type] || FileText;
  const statusColor = STATUS_COLORS[post.status] || STATUS_COLORS.draft;
  const canPublish = post.status === 'draft' || post.status === 'queued';
  const canEdit = post.status === 'draft' || post.status === 'queued';

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-lg border-l-4 transition-all relative
        ${isSelected 
          ? 'bg-orange-500/10 border-l-orange-500 ring-2 ring-orange-500/50' 
          : 'bg-zinc-800/50 border-l-zinc-600 hover:bg-zinc-800'
        }
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Checkbox for bulk selection */}
      {onCheckboxChange && (
        <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isCheckboxSelected}
            onCheckedChange={onCheckboxChange}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3 pr-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white">
            <PostTypeIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-white flex items-center gap-2">
              {post.title || 'Untitled Post'}
              <Badge className={statusColor}>
                {post.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
              <MapPin size={12} />
              <span>{post.location_name || 'Unknown Location'}</span>
              <Clock size={12} className="ml-2" />
              <span 
                title={post.published_at || post.created_at ? new Date(post.published_at || post.created_at || '').toLocaleString() : 'Unknown date'}
                className="cursor-help"
              >
                {formatTimeAgo(post.published_at || post.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Post Type Badge */}
        <Badge variant="outline" className="text-xs">
          {POST_TYPE_LABELS[post.post_type] || post.post_type}
        </Badge>
      </div>

      {/* Content Preview */}
      {post.content && (
        <p className="text-sm text-gray-300 mb-3 line-clamp-2">
          {post.content}
        </p>
      )}

      {/* Media Indicator */}
      {post.media_url && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
          <ImageIcon size={14} />
          <span>Has media</span>
        </div>
      )}

      {/* Scheduled Time */}
      {post.scheduled_at && post.status === 'queued' && (
        <div className="flex items-center gap-2 mb-3 text-xs text-blue-400">
          <Calendar size={14} />
          <span>Scheduled: {new Date(post.scheduled_at).toLocaleString()}</span>
        </div>
      )}

      {/* Published Time */}
      {post.published_at && post.status === 'published' && (
        <div className="flex items-center gap-2 mb-3 text-xs text-green-400">
          <CheckCircle size={14} />
          <span>Published: {new Date(post.published_at).toLocaleString()}</span>
        </div>
      )}

      {/* Error Message */}
      {post.status === 'failed' && post.error_message && (
        <div className="flex items-center gap-2 mb-3 text-xs text-red-400">
          <XCircle size={14} />
          <span>{post.error_message}</span>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-700">
        <div className="flex items-center gap-2">
          {post.call_to_action && (
            <Badge variant="outline" className="text-xs">
              CTA: {post.call_to_action}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {canPublish && onPublish && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPublish}
              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
            >
              <Send className="w-4 h-4 mr-1" />
              Publish
            </Button>
          )}
          {canEdit && onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

PostCard.displayName = 'PostCard';

