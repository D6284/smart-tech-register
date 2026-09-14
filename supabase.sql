create table if not exists public.applicants (
    id text primary key,
    data jsonb not null,
    created_at timestamptz not null default now()
);
alter table public.applicants enable row level security;
create policy "Allow public applicant reads" on public.applicants for
select to anon using (true);
create policy "Allow public applicant submissions" on public.applicants for
insert to anon with check (true);
create policy "Allow public applicant updates" on public.applicants for
update to anon using (true) with check (true);