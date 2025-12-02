/**
 * Google Business Profile Notifications Types
 *
 * These types define the structure of notifications received from
 * Google Business Profile via Pub/Sub.
 */

/**
 * Notification types from Google Business Profile
 */
export enum GmbNotificationType {
  /** New review posted */
  NEW_REVIEW = "NEW_REVIEW",

  /** Existing review updated */
  UPDATED_REVIEW = "UPDATED_REVIEW",

  /** New question asked */
  NEW_QUESTION = "NEW_QUESTION",

  /** Existing question updated */
  UPDATED_QUESTION = "UPDATED_QUESTION",

  /** New answer posted */
  NEW_ANSWER = "NEW_ANSWER",

  /** Existing answer updated */
  UPDATED_ANSWER = "UPDATED_ANSWER",

  /** New customer media (photo/video) uploaded */
  NEW_CUSTOMER_MEDIA = "NEW_CUSTOMER_MEDIA",

  /** Google made updates to location */
  GOOGLE_UPDATE = "GOOGLE_UPDATE",

  /** Duplicate location detected */
  DUPLICATE_LOCATION = "DUPLICATE_LOCATION",

  /** Voice of Merchant status changed */
  VOICE_OF_MERCHANT_UPDATED = "VOICE_OF_MERCHANT_UPDATED",
}

/**
 * Base notification data structure from Google
 */
export interface GmbNotificationData {
  /** Type of notification */
  notificationType: GmbNotificationType;

  /** Resource name of the location (e.g., "locations/12345") */
  locationName: string;

  /** Resource name of the review (if applicable) */
  reviewName?: string;

  /** Resource name of the question (if applicable) */
  questionName?: string;

  /** Resource name of the answer (if applicable) */
  answerName?: string;

  /** Resource name of the media item (if applicable) */
  mediaName?: string;

  /** Timestamp when the notification was created */
  createTime?: string;

  /** Timestamp when the resource was last updated */
  updateTime?: string;

  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Pub/Sub message structure
 */
export interface PubSubMessage {
  message: {
    /** Base64-encoded notification data */
    data: string;

    /** Message ID */
    messageId: string;

    /** Publish timestamp */
    publishTime: string;

    /** Message attributes */
    attributes?: Record<string, string>;
  };

  /** Subscription name */
  subscription?: string;
}

/**
 * Notification settings structure
 */
export interface NotificationSettings {
  /** Resource name (e.g., "accounts/12345/notificationSetting") */
  name: string;

  /** Google Pub/Sub topic (e.g., "projects/my-project/topics/gmb-notifications") */
  pubsubTopic: string;

  /** Types of notifications to receive */
  notificationTypes: GmbNotificationType[];
}

/**
 * Database notification record
 */
export interface NotificationRecord {
  /** Unique ID */
  id: string;

  /** User ID */
  user_id: string;

  /** Notification type (legacy field) */
  type: string;

  /** Google notification type */
  notification_type: GmbNotificationType;

  /** Notification title */
  title: string;

  /** Notification message */
  message: string;

  /** Related location ID (internal) */
  location_id?: string;

  /** Google location resource name */
  location_name?: string;

  /** Google review resource name */
  review_name?: string;

  /** Google question resource name */
  question_name?: string;

  /** Google answer resource name */
  answer_name?: string;

  /** Google media resource name */
  media_name?: string;

  /** Complete notification data from Google */
  raw_data?: GmbNotificationData;

  /** Whether the notification has been read */
  read: boolean;

  /** Creation timestamp */
  created_at: string;

  /** Update timestamp */
  updated_at?: string;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  /** User ID */
  user_id: string;

  /** Total unread notifications */
  unread_count: number;

  /** Total read notifications */
  read_count: number;

  /** Count of new reviews */
  new_reviews_count: number;

  /** Count of new questions */
  new_questions_count: number;

  /** Count of new media */
  new_media_count: number;

  /** Timestamp of latest unread notification */
  latest_unread_at?: string;
}

/**
 * Notification type metadata
 */
export interface NotificationTypeMetadata {
  /** Notification type */
  value: GmbNotificationType;

  /** Display label (Arabic) */
  label: string;

  /** Description (Arabic) */
  description: string;

  /** Priority level */
  priority: "high" | "medium" | "low";

  /** Icon name */
  icon?: string;

  /** Color theme */
  color?: string;
}

/**
 * Notification type metadata map
 */
export const NOTIFICATION_TYPE_METADATA: Record<
  GmbNotificationType,
  NotificationTypeMetadata
> = {
  [GmbNotificationType.NEW_REVIEW]: {
    value: GmbNotificationType.NEW_REVIEW,
    label: "مراجعة جديدة",
    description: "تم نشر مراجعة جديدة",
    priority: "high",
    icon: "star",
    color: "blue",
  },
  [GmbNotificationType.UPDATED_REVIEW]: {
    value: GmbNotificationType.UPDATED_REVIEW,
    label: "تحديث مراجعة",
    description: "تم تحديث مراجعة موجودة",
    priority: "medium",
    icon: "edit",
    color: "yellow",
  },
  [GmbNotificationType.NEW_QUESTION]: {
    value: GmbNotificationType.NEW_QUESTION,
    label: "سؤال جديد",
    description: "تم طرح سؤال جديد",
    priority: "high",
    icon: "help-circle",
    color: "green",
  },
  [GmbNotificationType.UPDATED_QUESTION]: {
    value: GmbNotificationType.UPDATED_QUESTION,
    label: "تحديث سؤال",
    description: "تم تحديث سؤال موجود",
    priority: "low",
    icon: "edit",
    color: "gray",
  },
  [GmbNotificationType.NEW_ANSWER]: {
    value: GmbNotificationType.NEW_ANSWER,
    label: "إجابة جديدة",
    description: "تم نشر إجابة جديدة",
    priority: "medium",
    icon: "message-circle",
    color: "green",
  },
  [GmbNotificationType.UPDATED_ANSWER]: {
    value: GmbNotificationType.UPDATED_ANSWER,
    label: "تحديث إجابة",
    description: "تم تحديث إجابة موجودة",
    priority: "low",
    icon: "edit",
    color: "gray",
  },
  [GmbNotificationType.NEW_CUSTOMER_MEDIA]: {
    value: GmbNotificationType.NEW_CUSTOMER_MEDIA,
    label: "صورة/فيديو جديد",
    description: "تم رفع صورة أو فيديو جديد",
    priority: "medium",
    icon: "image",
    color: "purple",
  },
  [GmbNotificationType.GOOGLE_UPDATE]: {
    value: GmbNotificationType.GOOGLE_UPDATE,
    label: "تحديث من Google",
    description: "قامت Google بتحديث المعلومات",
    priority: "high",
    icon: "alert-circle",
    color: "orange",
  },
  [GmbNotificationType.DUPLICATE_LOCATION]: {
    value: GmbNotificationType.DUPLICATE_LOCATION,
    label: "موقع مكرر",
    description: "تم اكتشاف موقع مكرر",
    priority: "high",
    icon: "alert-triangle",
    color: "red",
  },
  [GmbNotificationType.VOICE_OF_MERCHANT_UPDATED]: {
    value: GmbNotificationType.VOICE_OF_MERCHANT_UPDATED,
    label: "تحديث حالة الموقع",
    description: "تم تحديث حالة Voice of Merchant",
    priority: "high",
    icon: "shield",
    color: "blue",
  },
};

/**
 * Helper function to get notification type metadata
 */
export function getNotificationTypeMetadata(
  type: GmbNotificationType,
): NotificationTypeMetadata {
  return NOTIFICATION_TYPE_METADATA[type];
}

/**
 * Helper function to check if notification type is high priority
 */
export function isHighPriorityNotification(type: GmbNotificationType): boolean {
  return NOTIFICATION_TYPE_METADATA[type].priority === "high";
}

/**
 * Helper function to format notification type label
 */
export function formatNotificationTypeLabel(type: GmbNotificationType): string {
  return NOTIFICATION_TYPE_METADATA[type].label;
}
