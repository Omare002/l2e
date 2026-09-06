drop policy if exists "Quest participants readable by members" on public.quest_participants;

create policy "Quest participants readable by involved members"
on public.quest_participants
for select
to authenticated
using (
  auth.uid() = user_id
  or auth.uid() = invited_by
  or exists (
    select 1 from public.quests q
    where q.id = quest_id and q.creator_id = auth.uid()
  )
);