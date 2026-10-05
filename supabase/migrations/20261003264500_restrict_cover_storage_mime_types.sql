update storage.buckets
set
  public=true,
  file_size_limit=5242880,
  allowed_mime_types=array['image/png','image/jpeg','image/webp']::text[]
where id='intensive-covers';
