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
  reminder_hours: number;
  created_by: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
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

export type NotificationType =
  | "event_created"
  | "event_updated"
  | "event_cancelled"
  | "new_comment"
  | "new_rsvp"
  | "poll_created"
  | "poll_closed"
  | "event_reminder"
  | "availability_signal";

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
