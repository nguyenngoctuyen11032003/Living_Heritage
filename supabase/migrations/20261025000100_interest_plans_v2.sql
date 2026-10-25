-- Pricing table v2: six planned packages (trial, month, year, book, program, license) instead of month/year/book.
alter table public.interest_requests drop constraint if exists interest_requests_plan_check;
alter table public.interest_requests
  add constraint interest_requests_plan_check
  check (plan is null or plan in ('trial', 'month', 'year', 'book', 'program', 'license'));
