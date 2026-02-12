export type UserRole = "admin" | "member";
export type UserStatus = "pending" | "approved" | "denied" | "removed";
export type RsvpStatus = "yes" | "no" | "maybe";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string | null;
  estimated_cost: number | null;
  reminder_hours: number;
  twitch_stream_id: string | null;
  is_pinned: boolean;
  created_by: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  position: number;
  created_at: string;
}

export interface EventCategory {
  id: string;
  event_id: string;
  category_id: string;
  created_at: string;
}

export interface Rsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  guest_count: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

export interface Reaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface CommentWithUser extends Comment {
  user: Pick<Profile, "id" | "display_name" | "avatar_url">;
  reactions: ReactionGroup[];
}

export interface Poll {
  id: string;
  event_id: string;
  user_id: string;
  question: string;
  is_closed: boolean;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  position: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
}

export interface PollWithDetails extends Poll {
  creator: Pick<Profile, "id" | "display_name">;
  options: (PollOption & { vote_count: number })[];
  user_vote: string | null; // option_id the current user voted for
  total_votes: number;
}

export interface EventWithCreator extends Event {
  creator: Pick<Profile, "id" | "display_name" | "avatar_url">;
}

export interface RsvpWithUser extends Rsvp {
  user: Pick<Profile, "id" | "display_name" | "avatar_url">;
}

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum";
export type AchievementCategory = "attendance" | "social" | "special";

export interface AchievementDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: AchievementTier;
  tier_position: number;
  achievement_group: string;
  threshold: number;
  is_automatic: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  granted_by: string | null;
  created_at: string;
}

export interface UserAchievementWithDefinition extends UserAchievement {
  achievement: AchievementDefinition;
}

export interface FeaturedBadge {
  id: string;
  name: string;
  icon: string;
  tier: AchievementTier;
}

export type NotificationType =
  | "event_created"
  | "event_updated"
  | "event_cancelled"
  | "new_comment"
  | "new_rsvp"
  | "poll_created"
  | "poll_closed"
  | "event_reminder"
  | "availability_signal"
  | "achievement_unlocked"
  | "twitch_live";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  reference_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  type: NotificationType;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

export interface TwitchChannel {
  id: string;
  channel_name: string;
  twitch_user_id: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  description: string | null;
  broadcaster_type: string | null;
  is_live: boolean;
  current_stream_id: string | null;
  current_title: string | null;
  current_category: string | null;
  current_viewer_count: number;
  current_thumbnail_url: string | null;
  stream_started_at: string | null;
  last_checked_at: string | null;
  auto_create_events: boolean;
  added_by: string;
  created_at: string;
  updated_at: string;
}
