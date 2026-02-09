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

export interface CommentWithUser extends Comment {
  user: Pick<Profile, "id" | "display_name" | "avatar_url">;
}

export interface EventWithCreator extends Event {
  creator: Pick<Profile, "id" | "display_name" | "avatar_url">;
}

export interface RsvpWithUser extends Rsvp {
  user: Pick<Profile, "id" | "display_name" | "avatar_url">;
}
