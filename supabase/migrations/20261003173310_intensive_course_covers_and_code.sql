update public.intensive_courses
set
  code = 'EL097_EL099E',
  default_cover_url = '/covers/el097-el099e.svg',
  updated_at = now()
where code in ('EL097–EL099E','EL097-EL099E','EL097_EL099E');

update public.intensive_courses
set default_cover_url = '/covers/el098.svg', updated_at = now()
where code = 'EL098';

update public.intensive_courses
set default_cover_url = '/covers/el099.svg', updated_at = now()
where code = 'EL099';

update public.intensive_courses
set default_cover_url = '/covers/el111.svg', updated_at = now()
where code = 'EL111';

update public.intensive_courses
set default_cover_url = '/covers/el112.svg', updated_at = now()
where code = 'EL112';
