create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.assign_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
for each row execute function public.assign_first_admin();

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  short text not null default '',
  platforms text[] not null default '{}',
  capabilities text[] not null default '{}',
  industries text[] not null default '{}',
  tags text[] not null default '{}',
  access text not null default 'interactive',
  thumbnail_url text,
  screenshots text[] not null default '{}',
  model_url text,
  challenge text not null default '',
  approach text not null default '',
  value text not null default '',
  priority integer not null default 0,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.projects to anon;
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "Public can read projects" on public.projects for select to anon, authenticated using (true);
create policy "Admins insert" on public.projects for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "Admins update" on public.projects for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins delete" on public.projects for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

create policy "Admins read portfolio files" on storage.objects for select to authenticated using (bucket_id='portfolio' and public.has_role(auth.uid(),'admin'));
create policy "Admins upload portfolio" on storage.objects for insert to authenticated with check (bucket_id='portfolio' and public.has_role(auth.uid(),'admin'));
create policy "Admins update portfolio" on storage.objects for update to authenticated using (bucket_id='portfolio' and public.has_role(auth.uid(),'admin'));
create policy "Admins delete portfolio" on storage.objects for delete to authenticated using (bucket_id='portfolio' and public.has_role(auth.uid(),'admin'));

insert into public.projects (slug,priority,title,short,featured,platforms,capabilities,industries,tags,challenge,approach,value,access) values
('cash',100,'13-Week Cash Flow & Liquidity Model','Rolling liquidity visibility, working capital and scenario analysis.',true,'{Excel}','{"Working Capital","Cash Flow","FP&A"}','{"General / Cross-industry"}','{"Cash Forecasting","DSO / DOH / DPO","Scenarios"}','Give management a forward-looking view of cash, working capital pressure and liquidity risk.','A rolling 13-week model combining actuals, forecast vintages, cash bridge, EBITDA-to-cash reconciliation and working-capital drivers.','Improves liquidity visibility, highlights working-capital pressure early and gives management a clearer basis for cash decisions.','interactive'),
('ma',90,'Management Accounts & Executive Reporting','P&L, balance sheet, KPIs and management decision support.',true,'{Excel}','{"Management Reporting","FP&A","Dashboards"}','{"Multi-location Retail","F&B"}','{"Management Accounts","KPI Pack","MTD / YTD"}','Turn monthly financial data into a concise management view of performance, variances and operational drivers.','A management reporting pack combining financial statements, KPIs, commentary and visual analysis for executive review.','Turns month-end data into a concise management view of performance, variances and operating priorities.','interactive'),
('retail',80,'Multi-Location Retail FP&A','Store, country and format-level performance analysis.',true,'{Excel,"Power BI"}','{"FP&A","Management Reporting","Dashboards"}','{"Multi-location Retail"}','{"Retail FP&A","Store Economics","L2L"}','Understand performance across stores, formats and markets without losing sight of the drivers behind the consolidated result.','A multi-location planning and analysis model with store lifecycle, format, country, P&L and operating KPI views.','Makes it easier to identify where performance is being created or lost across stores, formats and markets.','interactive'),
('budget',70,'Budget & Forecast Model','Driver-based planning, scenarios and variance analysis.',false,'{Excel}','{"FP&A"}','{"General / Cross-industry","SaaS"}','{"Budgeting","Forecasting","Sensitivity"}','Create a planning model that can be updated quickly as assumptions change.','A driver-based forecast structure linking operational assumptions to financial outcomes, scenarios and variance analysis.','Creates a faster, more transparent planning cycle with clear links between assumptions and financial outcomes.','preview'),
('lbo',60,'Acquisition & LBO Model','Transaction analysis, debt structure and returns.',false,'{Excel}','{"Corporate Finance","Valuation"}','{"General / Cross-industry"}','{"M&A","LBO","Returns"}','Evaluate an acquisition under different operating, financing and exit assumptions.','An integrated acquisition/LBO framework covering purchase price, debt, operating performance, cash flow, exit and investor returns.','Supports disciplined transaction decisions by making financing, operating and exit assumptions transparent.','request'),
('valuation',50,'Valuation & Investment Appraisal','DCF, comparables and decision-focused sensitivity analysis.',false,'{Excel}','{"Valuation","Corporate Finance"}','{"General / Cross-industry","SaaS"}','{"DCF","NPV / IRR","Valuation"}','Translate forecasts and risk assumptions into an informed investment decision.','Valuation and investment appraisal using DCF, scenario/sensitivity analysis and return metrics.','Frames investment decisions around value, risk, sensitivity and expected returns.','preview'),
('dash',40,'CFO & Executive Dashboards','Financial and operational visibility at a glance.',false,'{"Power BI",Excel}','{"Dashboards","Management Reporting","Working Capital"}','{"General / Cross-industry","Multi-location Retail"}','{"Power BI","KPIs","Executive Reporting"}','Give leadership fast visibility of the few measures that matter most.','Decision-focused dashboards combining profitability, cash, working capital, trends, variances and operating KPIs.','Gives executives a faster view of performance and the drivers requiring management attention.','interactive'),
('cfo-pack',0,'CFO & FP&A Capability Pack','Executive overview of finance capabilities and selected work.',false,'{PDF}','{"FP&A","Management Reporting","Corporate Finance"}','{"General / Cross-industry"}','{"CFO Advisory","FP&A","Credentials"}','Help a prospective client quickly understand the breadth and depth of finance support available.','A concise capability pack covering reporting, forecasting, cash, performance, corporate finance, dashboards, credentials and selected case studies.','Lets prospective clients assess the breadth of CFO and FP&A support in one concise executive document.','preview');