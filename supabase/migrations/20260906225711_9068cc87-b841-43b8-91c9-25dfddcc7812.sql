ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'message_received','message_request','collaborator_invited','collaborator_accepted',
  'collaborator_declined','new_follower','project_upvoted','quest_invited','quest_won'
]));