CREATE POLICY "Users upload their own message images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete their own message images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'message-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Conversation members view message images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-images'
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.image_path = storage.objects.name
        AND auth.uid() IN (c.user_a, c.user_b)
    )
  );