export type StandupProfile = {
  id: string;
  full_name: string | null;
};

export type StandupAttendee = {
  profile: StandupProfile | null;
};

export type Standup = {
  id: string;
  standup_date: string;
  summary: string | null;
  blockers: string | null;
  happened: boolean;
  logged_by: string | null;
  created_at: string;
  attendees: StandupAttendee[];
};

export type BroadcastResult = {
  sent: number;
  failed: number;
  skipped: number;
};
