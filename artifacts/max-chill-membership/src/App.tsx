import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  getGetDashboardQueryKey,
  getGetMemberQueryKey,
  getHealthCheckQueryKey,
  getListMemberVisitsQueryKey,
  getListMembersQueryKey,
  useCreateMember,
  useCreateVisit,
  useGetDashboard,
  useGetMember,
  useHealthCheck,
  useListMemberVisits,
  useListMembers,
  useUpdateMember,
} from '@workspace/api-client-react';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Leaf,
  LoaderCircle,
  MapPin,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sprout,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams } from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false } },
});

const navItems = [
  { href: '/', label: 'Quick check-in', icon: CheckCircle2 },
  { href: '/dashboard', label: 'Overview', icon: Sprout },
  { href: '/members', label: 'Members', icon: UsersRound },
  { href: '/tiers', label: 'Tier proposal', icon: BadgeCheck },
];

function currency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}
function dateLabel(value?: string | null, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return 'No visit recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', options).format(date);
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map(part => part[0]?.toUpperCase()).join('') || 'M';
}
function tierClass(tier: string) {
  if (tier === 'Gold') return 'tier-gold';
  if (tier === 'Silver') return 'tier-silver';
  return 'tier-member';
}
function ErrorNotice({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900" role="alert" data-testid="status-error">
      <div className="flex items-start gap-3">
        <CircleHelp size={18} className="mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">Couldn’t load this just now</p>
          <p className="mt-1 text-rose-800/80">{message || 'Check your connection, then try again.'}</p>
        </div>
        {onRetry && <button className="font-semibold underline underline-offset-4" onClick={onRetry} data-testid="button-retry">Try again</button>}
      </div>
    </div>
  );
}
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden="true" />;
}
function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono-label text-[10px] uppercase tracking-[.2em] text-emerald-800/70">{eyebrow}</p>
        <h1 className="font-editorial mt-2 text-4xl leading-tight tracking-[-.035em] text-emerald-950 sm:text-[3.1rem]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}
function ButtonLink({ href, children, testId, secondary = false }: { href: string; children: ReactNode; testId: string; secondary?: boolean }) {
  return <Link href={href} data-testid={testId} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 ${secondary ? 'border border-stone-300 bg-card text-emerald-950 hover:border-emerald-800/30' : 'bg-emerald-900 text-amber-50 shadow-[0_5px_14px_hsl(159_37%_25%/.15)] hover:bg-emerald-800'}`}>{children}</Link>;
}

function ServicePulse() {
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), retry: 1 } });
  const online = health.isSuccess && health.data?.status?.toLowerCase() === 'ok';
  return (
    <div className="flex items-center gap-2 text-[11px] text-amber-50/65" data-testid="status-service">
      <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-[#a9c48b]' : health.isError ? 'bg-[#df8f71]' : 'bg-[#d6b96b]'}`} />
      {health.isLoading ? 'Checking service' : online ? 'Register ready' : health.isError ? 'Service connection issue' : 'Service available'}
    </div>
  );
}
function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [location]);
  return (
    <div className="soft-grain min-h-[100dvh]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[258px] flex-col bg-emerald-950 text-amber-50 lg:flex">
        <div className="px-7 pb-8 pt-8">
          <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
            <span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#d8a76a] text-emerald-950"><Leaf size={22} strokeWidth={1.8} /></span>
            <span><span className="block font-editorial text-[21px] leading-none">Max Chill</span><span className="mt-1 block text-[10px] uppercase tracking-[.21em] text-amber-100/55">Garden membership</span></span>
          </Link>
        </div>
        <div className="px-7 pb-3"><p className="font-mono-label text-[9px] uppercase tracking-[.2em] text-amber-50/35">Staff desk</p></div>
        <nav className="space-y-1 px-3" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href === '/members' && location.startsWith('/members'));
            return <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] transition ${active ? 'bg-amber-50/10 text-[#f1ca92]' : 'text-amber-50/65 hover:bg-amber-50/[.06] hover:text-amber-50'}`}><Icon size={17} strokeWidth={1.8} />{label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f1ca92]" />}</Link>;
          })}
        </nav>
        <div className="mt-auto px-6 pb-7">
          <div className="rounded-2xl border border-amber-50/10 bg-amber-50/[.045] p-4">
            <MapPin size={16} className="mb-3 text-[#e7bd80]" />
            <p className="text-sm font-medium">A little room to breathe.</p>
            <p className="mt-1 text-[11px] leading-5 text-amber-50/50">Welcome guests back to the garden, one visit at a time.</p>
          </div>
          <div className="mt-4 px-1"><ServicePulse /></div>
        </div>
      </aside>
      <div className="lg:pl-[258px]">
        <header className="sticky top-0 z-20 border-b border-stone-300/60 bg-[#f4f0e6]/95 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5" data-testid="link-mobile-brand">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900 text-amber-100"><Leaf size={19} /></span>
              <span><span className="block font-editorial text-lg leading-none text-emerald-950">Max Chill</span><span className="mt-1 block text-[9px] uppercase tracking-[.16em] text-stone-500">Garden membership</span></span>
            </Link>
            <button aria-label="Toggle navigation" onClick={() => setMobileOpen(!mobileOpen)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 text-emerald-950" data-testid="button-mobile-menu">{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
          </div>
          {mobileOpen && <nav className="grid grid-cols-2 gap-2 border-t border-stone-300/70 px-4 py-3" aria-label="Mobile navigation">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${location === href || (href === '/members' && location.startsWith('/members')) ? 'bg-emerald-900 text-amber-50' : 'bg-white/60 text-emerald-950'}`}><Icon size={15} />{label}</Link>)}<div className="col-span-2 px-1 pt-1"><ServicePulse /></div></nav>}
        </header>
        <main className="mx-auto max-w-[1360px] px-4 pb-24 pt-7 sm:px-7 sm:pt-10 lg:px-10 lg:pb-14">{children}</main>
      </div>
    </div>
  );
}

function VisitEntry({ memberId, onDone, onCancel, compact = false }: { memberId: number; onDone?: () => void; onCancel?: () => void; compact?: boolean }) {
  const mutation = useCreateVisit();
  const queryClient = useQueryClient();
  const [partySize, setPartySize] = useState('2');
  const [billAmount, setBillAmount] = useState('');
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    mutation.mutate({ memberId, data: { arrivedAt: new Date().toISOString(), partySize: Number(partySize), billAmount: Number(billAmount || 0), note: note.trim() || null } }, {
      onSuccess: () => {
        setSuccess(true);
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(memberId) });
        queryClient.invalidateQueries({ queryKey: getListMemberVisitsQueryKey(memberId) });
        onDone?.();
      },
      onError: () => setError('The visit was not saved. Please try again.'),
    });
  };
  return (
    <div className={`rounded-2xl border border-emerald-900/10 bg-[#faf7ef] ${compact ? 'p-4' : 'p-5 sm:p-6'}`} data-testid="panel-visit-entry">
      <div className="mb-4 flex items-start justify-between">
        <div><p className="font-mono-label text-[9px] uppercase tracking-[.18em] text-emerald-800/65">Visit details</p><h3 className="font-editorial mt-1 text-xl text-emerald-950">Make this visit count</h3></div>
        {onCancel && <button onClick={onCancel} aria-label="Close visit form" className="rounded-lg p-2 text-stone-500 hover:bg-stone-200" data-testid="button-cancel-visit"><X size={17} /></button>}
      </div>
      {success ? <div role="status" className="flex items-center gap-3 rounded-xl bg-[#e4efe2] p-4 text-sm font-medium text-emerald-950" data-testid="status-visit-success"><CheckCircle2 size={19} />Visit recorded. Thank you for looking after our regulars.</div> : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-stone-700">Party size
              <input required type="number" min="1" max="50" value={partySize} onChange={e => setPartySize(e.target.value)} className="form-control mt-1.5" data-testid="input-party-size" />
            </label>
            <label className="block text-xs font-semibold text-stone-700">Bill amount <span className="font-normal text-stone-500">(VND)</span>
              <input type="number" min="0" step="1000" value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder="Optional" className="form-control mt-1.5" data-testid="input-bill-amount" />
            </label>
          </div>
          <label className="block text-xs font-semibold text-stone-700">Note <span className="font-normal text-stone-500">(optional)</span>
            <input value={note} onChange={e => setNote(e.target.value)} maxLength={2000} placeholder="A detail worth remembering" className="form-control mt-1.5" data-testid="input-visit-note" />
          </label>
          {error && <p className="text-xs font-medium text-rose-800" role="alert" data-testid="status-visit-error">{error}</p>}
          <div className="flex gap-2">
            <button disabled={mutation.isPending} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 text-sm font-semibold text-amber-50 transition hover:bg-emerald-800 disabled:opacity-60" data-testid="button-save-visit">{mutation.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} Record visit</button>
            {onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-stone-300 px-4 text-sm font-semibold text-stone-600" data-testid="button-dismiss-visit">Cancel</button>}
          </div>
        </form>
      )}
    </div>
  );
}

function HomePage() {
  const [phone, setPhone] = useState('');
  const [search, setSearch] = useState('');
  const [activeMember, setActiveMember] = useState<number | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(phone.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [phone]);
  const params = useMemo(() => search ? { search } : undefined, [search]);
  const result = useListMembers(params);
  const results = result.data || [];
  const hasQuery = phone.trim().length > 0;
  const exactPhone = results.find(member => member.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
  const bestMatch = exactPhone || results[0];
  return (
    <div className="page-enter">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p className="font-mono-label text-[10px] uppercase tracking-[.2em] text-emerald-800/70">Max Chill Garden · Staff desk</p><h1 className="font-editorial mt-2 text-[2.6rem] leading-[1.05] tracking-[-.04em] text-emerald-950 sm:text-5xl">A familiar face.<br className="sm:hidden" /> A warmer welcome.</h1><p className="mt-3 max-w-lg text-sm leading-6 text-stone-600">Look up a guest by phone and take care of their visit in a few seconds.</p></div>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-900/10 bg-white/55 px-3 py-2 text-[11px] text-emerald-900/70 sm:flex"><Clock3 size={14} />Just the essentials, between tables</div>
      </div>
      <section className="relative overflow-hidden rounded-[28px] bg-emerald-950 text-amber-50 shadow-[0_20px_65px_hsl(158_30%_22%/.13)]">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-amber-50/[.08]" /><div className="absolute -right-2 -top-10 h-48 w-48 rounded-full border border-amber-50/[.08]" />
        <div className="relative grid lg:grid-cols-[1.05fr_.95fr]">
          <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-11">
            <div className="mb-7 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#dfb980]"><Search size={14} /> Find a member</div>
            <label className="mb-2 block text-xs text-amber-50/70" htmlFor="phone-search">Phone number</label>
            <div className="flex items-center rounded-2xl border border-amber-50/15 bg-amber-50/[.08] px-4 transition focus-within:border-[#dfb980]/75 focus-within:bg-amber-50/[.12]">
              <span className="mr-3 font-mono-label text-sm text-amber-50/50">+84</span>
              <input id="phone-search" type="tel" value={phone} onChange={e => { setPhone(e.target.value); setActiveMember(null); }} placeholder="Enter guest’s phone" className="h-[58px] min-w-0 flex-1 bg-transparent text-lg text-amber-50 outline-none placeholder:text-amber-50/30" data-testid="input-phone-lookup" />
              {phone && <button onClick={() => { setPhone(''); setActiveMember(null); }} aria-label="Clear phone search" className="rounded-lg p-2 text-amber-50/55 hover:bg-white/10" data-testid="button-clear-search"><X size={16} /></button>}
            </div>
            <div className="mt-5 flex items-center gap-2 text-[11px] text-amber-50/50"><ShieldCheck size={14} className="text-[#d6b96b]" />Use the phone number the guest used to register.</div>
            <div className="mt-8 border-t border-amber-50/10 pt-5">
              <p className="text-sm text-amber-50/65">New around here?</p>
              <Link href="/members/new" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#f0c68b] hover:text-amber-100" data-testid="link-register-member"><Plus size={16} /> Register a new member <ArrowRight size={15} /></Link>
            </div>
          </div>
          <div className="border-t border-amber-50/10 bg-[#123e31]/60 px-5 py-6 sm:px-8 lg:border-l lg:border-t-0 lg:px-9 lg:py-10">
            {!hasQuery ? (
              <div className="flex h-full min-h-[225px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] border border-amber-50/10 bg-amber-50/[.055] text-[#e0bb82]"><UsersRound size={23} strokeWidth={1.5} /></div>
                <p className="font-editorial text-[22px] text-amber-50/90">Your next hello starts here.</p><p className="mt-2 max-w-[250px] text-xs leading-5 text-amber-50/50">Search the number they used to join. We’ll find the right person.</p>
              </div>
            ) : result.isLoading ? (
              <div className="space-y-4 py-2" data-testid="loading-member-lookup"><Skeleton className="h-5 w-32" /><Skeleton className="h-24 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : result.isError ? <ErrorNotice message="Member lookup is unavailable." onRetry={() => result.refetch()} /> : bestMatch ? (
              <div className="animate-in">
                <div className="mb-5 flex items-center justify-between"><p className="font-mono-label text-[10px] uppercase tracking-[.18em] text-amber-50/50">Guest match</p><span className={`tier-pill ${tierClass(bestMatch.tier)}`} data-testid={`status-member-tier-${bestMatch.id}`}>{bestMatch.tier}</span></div>
                <div className="mb-5 flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#d8a76a] font-editorial text-xl text-emerald-950" data-testid={`avatar-member-${bestMatch.id}`}>{initials(bestMatch.fullName)}</span>
                  <div><Link href={`/members/${bestMatch.id}`} className="font-editorial text-2xl tracking-[-.02em] text-amber-50 hover:text-[#f0c68b]" data-testid={`link-member-profile-${bestMatch.id}`}>{bestMatch.fullName}</Link><p className="mt-1 font-mono-label text-[11px] text-amber-50/55" data-testid={`text-member-phone-${bestMatch.id}`}>{bestMatch.phone}</p></div>
                </div>
                <div className="mb-5 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-amber-50/[.09] bg-amber-50/[.045] px-3 py-2.5"><p className="font-mono-label text-[9px] uppercase tracking-[.14em] text-amber-50/45">Visits</p><p className="mt-1 text-lg font-semibold" data-testid={`text-visit-count-${bestMatch.id}`}>{bestMatch.visitCount}</p></div>
                  <div className="rounded-xl border border-amber-50/[.09] bg-amber-50/[.045] px-3 py-2.5"><p className="font-mono-label text-[9px] uppercase tracking-[.14em] text-amber-50/45">Last seen</p><p className="mt-1 text-sm font-semibold" data-testid={`text-last-visit-${bestMatch.id}`}>{bestMatch.lastVisitAt ? dateLabel(bestMatch.lastVisitAt, { day: 'numeric', month: 'short' }) : 'First visit'}</p></div>
                </div>
                {activeMember === bestMatch.id ? <VisitEntry compact memberId={bestMatch.id} onCancel={() => setActiveMember(null)} onDone={() => window.setTimeout(() => setActiveMember(null), 1700)} /> : <button onClick={() => setActiveMember(bestMatch.id)} className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#e6bd81] px-4 text-sm font-bold text-emerald-950 transition hover:bg-[#f0ca91]" data-testid={`button-checkin-${bestMatch.id}`}><CheckCircle2 size={17} /> Record today’s visit <ArrowRight size={15} /></button>}
                {!exactPhone && results.length > 1 && <p className="mt-3 text-center text-[10px] text-amber-50/45">Showing closest match · {results.length} results</p>}
              </div>
            ) : <div className="flex min-h-[225px] flex-col justify-center">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50/[.08] text-[#dfb980]"><Search size={20} /></div><p className="font-editorial text-[22px] text-amber-50">No familiar face yet.</p><p className="mt-2 max-w-xs text-xs leading-5 text-amber-50/55">We couldn’t find that number. Check for a typo, or register them as a new member.</p>
              <div className="mt-5 flex flex-wrap gap-2"><Link href="/members/new" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#e6bd81] px-3 text-xs font-bold text-emerald-950" data-testid="link-register-from-lookup"><Plus size={15} /> Register member</Link><button onClick={() => setPhone('')} className="rounded-xl border border-amber-50/15 px-3 text-xs font-semibold text-amber-50/75" data-testid="button-try-another">Try another number</button></div>
            </div>}
          </div>
        </div>
      </section>
      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex items-start gap-3 rounded-2xl border border-stone-300/70 bg-[#fbf8f0]/75 px-4 py-4 sm:px-5"><span className="mt-0.5 text-emerald-800"><Sprout size={18} /></span><div><p className="text-sm font-semibold text-emerald-950">A small note for the shift</p><p className="mt-1 text-xs leading-5 text-stone-600">Record the visit while they’re here. Party size and spend help us make each return feel more personal.</p></div></div>
        <ButtonLink href="/members" secondary testId="link-all-members">Browse members <ArrowRight size={15} /></ButtonLink>
      </div>
    </div>
  );
}

function DashboardPage() {
  const dashboard = useGetDashboard();
  const stats = dashboard.data;
  if (dashboard.isLoading) return <div className="page-enter"><PageTitle eyebrow="Garden register" title="The garden, at a glance." subtitle="A quiet overview of the community growing around Max Chill." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(n => <Skeleton key={n} className="h-32" />)}<Skeleton className="col-span-full h-72" /></div></div>;
  if (dashboard.isError || !stats) return <div className="page-enter"><PageTitle eyebrow="Garden register" title="The garden, at a glance." subtitle="A quiet overview of the community growing around Max Chill." /><ErrorNotice message="We couldn’t bring in the membership overview." onRetry={() => dashboard.refetch()} /></div>;
  const capacityUsed = stats.pilotCapacity.limit > 0 ? Math.max(0, Math.min(100, ((stats.pilotCapacity.limit - stats.pilotCapacity.remaining) / stats.pilotCapacity.limit) * 100)) : 0;
  const statCards = [
    { label: 'Members in the garden', value: stats.totalMembers, icon: UsersRound, note: 'All registered guests', accent: 'bg-[#e6efe1] text-emerald-900' },
    { label: 'New members', value: stats.newMembers, icon: ArrowUpRight, note: 'Recently welcomed', accent: 'bg-[#fae9d2] text-[#9a542f]' },
    { label: 'Returning guests', value: stats.returningMembers, icon: ArrowDownRight, note: 'More than one visit', accent: 'bg-[#e7ece5] text-[#49634e]' },
    { label: 'Silver · Gold', value: stats.silverMembers + stats.goldMembers, icon: BadgeCheck, note: `${stats.silverMembers} Silver · ${stats.goldMembers} Gold`, accent: 'bg-[#f4e4c8] text-[#805d2d]' },
  ];
  return (
    <div className="page-enter">
      <PageTitle eyebrow="Garden register / overview" title="The garden, at a glance." subtitle="A quiet overview of the community growing around Max Chill." action={<ButtonLink href="/members/new" testId="link-add-member"><Plus size={16} /> New member</ButtonLink>} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Membership statistics">
        {statCards.map(({ label, value, icon: Icon, note, accent }, i) => <article key={label} className="rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 shadow-[0_5px_18px_hsl(40_24%_40%/.04)]" data-testid={`card-stat-${i}`}>
          <div className="flex items-start justify-between"><p className="text-xs font-semibold text-stone-600">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}><Icon size={17} /></span></div>
          <p className="font-editorial mt-4 text-[2rem] leading-none text-emerald-950" data-testid={`text-stat-${i}`}>{value.toLocaleString()}</p><p className="mt-2 text-[11px] text-stone-500">{note}</p>
        </article>)}
      </section>
      <section className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4"><div><p className="font-mono-label text-[9px] uppercase tracking-[.18em] text-emerald-800/65">Our regulars</p><h2 className="font-editorial mt-1 text-2xl text-emerald-950">Most visits</h2></div><span className="rounded-full bg-emerald-900/[.07] px-3 py-1 text-[10px] font-semibold text-emerald-900">All time</span></div>
          {stats.topByVisits.length ? <div className="divide-y divide-stone-200/75">{stats.topByVisits.map((member, index) => <Link href={`/members/${member.id}`} key={member.id} className="group flex items-center gap-3 py-3.5" data-testid={`row-top-visits-${member.id}`}>
            <span className="font-mono-label w-5 text-xs text-stone-400">0{index + 1}</span><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#e8ede3] font-editorial text-sm text-emerald-900">{initials(member.fullName)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-emerald-950 group-hover:text-emerald-700">{member.fullName}</span><span className="mt-1 block font-mono-label text-[9px] text-stone-500">{member.tier} member</span></span><span className="text-right"><span className="block text-sm font-bold text-emerald-950" data-testid={`text-top-visits-count-${member.id}`}>{member.visitCount}</span><span className="text-[9px] text-stone-500">visits</span></span><ChevronRight size={15} className="text-stone-400 transition group-hover:translate-x-1" />
          </Link>)}</div> : <EmptyList title="No visits to rank yet" detail="Once guests begin returning, your most familiar faces will show here." />}
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-[#dfb67d] p-5 text-emerald-950 sm:p-6">
            <p className="font-mono-label text-[9px] uppercase tracking-[.18em] text-emerald-950/60">Pilot capacity</p><div className="mt-3 flex items-end justify-between"><div><p className="font-editorial text-[2.8rem] leading-none" data-testid="text-capacity-remaining">{stats.pilotCapacity.remaining}</p><p className="mt-2 text-xs text-emerald-950/70">places remaining</p></div><p className="pb-1 text-sm font-semibold">{stats.pilotCapacity.limit} total places</p></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-emerald-950/15"><div className="h-full rounded-full bg-emerald-950 transition-all" style={{ width: `${capacityUsed}%` }} /></div><div className="mt-2 flex justify-between text-[10px] text-emerald-950/65"><span>{Math.round(capacityUsed)}% welcomed</span><span>Early membership pilot</span></div>
          </div>
          <div className="flex-1 rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2"><Wallet size={16} className="text-[#a55b3b]" /><div><p className="font-mono-label text-[9px] uppercase tracking-[.16em] text-stone-500">Spend leaders</p><h2 className="font-editorial text-xl text-emerald-950">Generous guests</h2></div></div>
            {stats.topBySpend.length ? <div className="space-y-3">{stats.topBySpend.slice(0, 4).map(member => <Link key={member.id} href={`/members/${member.id}`} className="flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-stone-100/80" data-testid={`row-top-spend-${member.id}`}><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f4e4d5] font-editorial text-xs text-[#9a542f]">{initials(member.fullName)}</span><span className="min-w-0 flex-1 truncate text-xs font-semibold text-emerald-950">{member.fullName}</span><span className="text-xs font-semibold text-stone-700" data-testid={`text-spend-total-${member.id}`}>{currency(member.totalSpend)}</span></Link>)}</div> : <EmptyList title="Spend details will appear here" detail="A member’s recorded visits add up over time." />}
          </div>
        </div>
      </section>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-900/10 bg-emerald-900/[.045] px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/75 text-emerald-900"><Leaf size={17} /></span><div><p className="text-sm font-semibold text-emerald-950">Keep the welcome personal.</p><p className="text-xs text-stone-600">A quick note today can make next time feel familiar.</p></div></div><ButtonLink href="/" secondary testId="link-start-checkin">Start a check-in <ArrowRight size={14} /></ButtonLink></div>
    </div>
  );
}

function EmptyList({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl border border-dashed border-stone-300 px-4 py-7 text-center" data-testid="empty-state"><div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-emerald-800"><Sprout size={17} /></div><p className="mt-3 text-sm font-semibold text-emerald-950">{title}</p><p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-stone-500">{detail}</p></div>;
}

function MembersPage() {
  const [search, setSearch] = useState('');
  const params = useMemo(() => search.trim() ? { search: search.trim() } : undefined, [search]);
  const members = useListMembers(params);
  return (
    <div className="page-enter">
      <PageTitle eyebrow="Garden register / people" title="Good to see you again." subtitle="Find a familiar name, check their membership, or welcome somebody new." action={<ButtonLink href="/members/new" testId="link-new-member"><Plus size={16} /> Register member</ButtonLink>} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-[420px]"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" /><input type="search" placeholder="Search name or phone number" value={search} onChange={e => setSearch(e.target.value)} className="form-control h-12 pl-11" data-testid="input-member-search" /></label>
        {!members.isLoading && !members.isError && <p className="text-xs text-stone-500" data-testid="text-member-results">{members.data?.length ?? 0} {members.data?.length === 1 ? 'member' : 'members'} found</p>}
      </div>
      {members.isLoading ? <div className="space-y-3" data-testid="loading-members">{[1,2,3,4].map(n => <Skeleton key={n} className="h-[76px]" />)}</div> : members.isError ? <ErrorNotice message="The member register could not be loaded." onRetry={() => members.refetch()} /> : members.data?.length ? (
        <div className="overflow-hidden rounded-2xl border border-stone-300/80 bg-[#fbf8f0]">
          <div className="hidden grid-cols-[minmax(220px,1.5fr)_1fr_.7fr_.8fr_24px] gap-4 border-b border-stone-200 bg-[#f5f0e5] px-5 py-3 font-mono-label text-[9px] uppercase tracking-[.14em] text-stone-500 md:grid"><span>Member</span><span>Membership</span><span>Visits</span><span>Last seen</span><span /></div>
          {members.data.map(member => <Link key={member.id} href={`/members/${member.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-stone-200/75 px-4 py-4 transition hover:bg-[#f4f0e6] last:border-b-0 sm:px-5 md:grid-cols-[minmax(220px,1.5fr)_1fr_.7fr_.8fr_24px] md:gap-4" data-testid={`row-member-${member.id}`}>
            <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#e8ede3] font-editorial text-sm text-emerald-900">{initials(member.fullName)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-emerald-950">{member.fullName}</span><span className="mt-1 block font-mono-label text-[10px] text-stone-500">{member.phone}</span></span></span>
            <span className="hidden md:block"><span className={`tier-pill ${tierClass(member.tier)}`} data-testid={`status-member-tier-${member.id}`}>{member.tier}</span></span>
            <span className="text-right text-xs font-semibold text-emerald-950 md:text-left">{member.visitCount}<span className="ml-1 font-normal text-stone-500 md:hidden">visits ·</span></span>
            <span className="col-start-1 text-[10px] text-stone-500 md:col-start-auto md:text-xs" data-testid={`text-member-last-visit-${member.id}`}>{member.lastVisitAt ? `Last seen ${dateLabel(member.lastVisitAt,{day:'numeric',month:'short',year:'numeric'})}` : 'No visit yet'}</span>
            <ChevronRight size={16} className="col-start-2 row-start-1 text-stone-400 md:col-start-auto md:row-start-auto" />
            <span className={`tier-pill col-start-2 row-start-2 justify-self-end md:hidden ${tierClass(member.tier)}`}>{member.tier}</span>
          </Link>)}
        </div>
      ) : <EmptyList title={search ? 'No members match that search' : 'Your member list is ready to grow'} detail={search ? 'Try a different name or phone number.' : 'Register your first familiar face and they’ll appear here.'} />}
      <p className="mt-4 text-[11px] text-stone-500">Membership tiers shown here are current API records. Proposed benefits are not automatically granted.</p>
    </div>
  );
}

function MemberForm({ initial, onSave, onCancel, saving, submitLabel }: { initial?: { fullName: string; phone: string; birthday?: string | null; notes?: string | null }; onSave: (data: { fullName: string; phone: string; birthday: string | null; notes: string | null }) => void; onCancel?: () => void; saving: boolean; submitLabel: string }) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [birthday, setBirthday] = useState(initial?.birthday?.slice(0,10) ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [issue, setIssue] = useState('');
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phone.replace(/\D/g, '').length < 8) { setIssue('Enter a phone number with at least 8 digits.'); return; }
    setIssue('');
    onSave({ fullName: fullName.trim(), phone: phone.trim(), birthday: birthday || null, notes: notes.trim() || null });
  };
  return <form onSubmit={submit} className="space-y-5" data-testid="form-member">
    <label className="block text-xs font-semibold text-emerald-950">Full name <span className="text-[#b75e3c]">*</span><input required maxLength={120} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Name they go by" className="form-control mt-2" data-testid="input-member-name" /></label>
    <label className="block text-xs font-semibold text-emerald-950">Phone number <span className="text-[#b75e3c]">*</span><input required type="tel" minLength={8} maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+84 90 123 4567" className="form-control mt-2" data-testid="input-member-phone" /><span className="mt-1.5 block font-normal text-stone-500">Used to recognize returning guests.</span></label>
    <label className="block text-xs font-semibold text-emerald-950">Birthday <span className="font-normal text-stone-500">(optional)</span><input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="form-control mt-2" data-testid="input-member-birthday" /></label>
    <label className="block text-xs font-semibold text-emerald-950">Notes <span className="font-normal text-stone-500">(optional)</span><textarea maxLength={2000} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="A preference or detail to remember" className="form-control mt-2 resize-y py-3" data-testid="input-member-notes" /></label>
    {issue && <p className="text-xs font-medium text-rose-800" role="alert" data-testid="status-form-error">{issue}</p>}
    <div className="flex flex-col-reverse gap-2 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end">{onCancel && <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-stone-300 px-5 text-sm font-semibold text-stone-700 hover:bg-stone-100" data-testid="button-cancel-member">Cancel</button>}<button disabled={saving} type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-amber-50 hover:bg-emerald-800 disabled:opacity-60" data-testid="button-submit-member">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{submitLabel}</button></div>
  </form>;
}

function NewMemberPage() {
  const create = useCreateMember();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [error, setError] = useState('');
  return <div className="page-enter">
    <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-emerald-900" data-testid="link-back-home"><ArrowLeft size={15} /> Back to quick check-in</Link>
    <PageTitle eyebrow="Garden register / welcome" title="Let’s make it familiar." subtitle="Add a name and number so the team can recognize them next time." />
    <div className="grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 sm:p-7">
        {error && <div className="mb-5"><ErrorNotice message={error} /></div>}
        <MemberForm saving={create.isPending} submitLabel="Register member" onSave={data => {
          setError('');
          create.mutate({ data: { ...data, joinedAt: new Date().toISOString() } }, {
            onSuccess: member => { queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setLocation(`/members/${member.id}`); },
            onError: () => setError('We couldn’t register this member. Check the details and try again.'),
          });
        }} />
      </section>
      <aside className="h-fit rounded-2xl bg-[#e3ebdf] p-5 text-emerald-950">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-emerald-900"><Sprout size={19} /></span><p className="font-editorial mt-4 text-xl">Just enough to remember.</p><p className="mt-2 text-xs leading-5 text-emerald-950/70">Phone is how we find them again. Birthday and notes are optional, helpful details for a more thoughtful welcome.</p><div className="mt-5 border-t border-emerald-900/10 pt-4 text-[10px] leading-5 text-emerald-950/60">New members start as Member. Silver/Gold labels preview draft thresholds; their benefits are not active.</div>
      </aside>
    </div>
  </div>;
}

function MemberProfilePage() {
  const params = useParams<{ memberId: string }>();
  const memberId = Number(params.memberId);
  const validId = Number.isFinite(memberId) && memberId > 0;
  const memberQuery = useGetMember(validId ? memberId : 0, { query: { enabled: validId, queryKey: getGetMemberQueryKey(validId ? memberId : 0) } });
  const visitQuery = useListMemberVisits(validId ? memberId : 0, { query: { enabled: validId, queryKey: getListMemberVisitsQueryKey(validId ? memberId : 0) } });
  const update = useUpdateMember();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  if (!validId) return <ErrorNotice message="That member link is not valid." />;
  if (memberQuery.isLoading) return <div className="page-enter"><Skeleton className="mb-5 h-7 w-28" /><Skeleton className="h-56 w-full" /><Skeleton className="mt-5 h-64 w-full" /></div>;
  if (memberQuery.isError || !memberQuery.data) return <div className="page-enter"><Link href="/members" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-stone-600" data-testid="link-back-members"><ArrowLeft size={15} /> Members</Link><ErrorNotice message="This member profile could not be found." onRetry={() => memberQuery.refetch()} /></div>;
  const member = memberQuery.data;
  return <div className="page-enter">
    <Link href="/members" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-emerald-900" data-testid="link-back-members"><ArrowLeft size={15} /> All members</Link>
    {success && <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#e3efe1] px-4 py-3 text-sm font-medium text-emerald-900" role="status" data-testid="status-member-saved"><CheckCircle2 size={16} />{success}</div>}
    {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
    <section className="overflow-hidden rounded-[26px] border border-stone-300/75 bg-[#fbf8f0]">
      <div className="relative bg-emerald-950 px-5 py-7 text-amber-50 sm:px-8 sm:py-9">
        <div className="absolute -right-6 -top-20 h-52 w-52 rounded-full border border-amber-50/[.09]" /><div className="absolute right-12 -top-8 h-32 w-32 rounded-full border border-amber-50/[.08]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[24px] bg-[#d8a76a] font-editorial text-[26px] text-emerald-950" data-testid={`avatar-profile-${member.id}`}>{initials(member.fullName)}</span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h1 className="font-editorial text-[2rem] leading-tight tracking-[-.025em] sm:text-[2.5rem]" data-testid="text-profile-name">{member.fullName}</h1><span className={`tier-pill ${tierClass(member.tier)}`} data-testid="status-profile-tier">{member.tier}</span></div><p className="mt-2 font-mono-label text-xs text-amber-50/60" data-testid="text-profile-phone">{member.phone}</p><p className="mt-1 text-xs text-amber-50/50">Member since {dateLabel(member.joinedAt)}</p></div>
          <button onClick={() => { setEditing(!editing); setShowVisitForm(false); }} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-amber-50/20 px-4 text-xs font-semibold text-amber-50 hover:bg-amber-50/10 sm:self-center" data-testid="button-edit-member">{editing ? <X size={15} /> : <span className="text-base leading-none">+</span>}{editing ? 'Close edit' : 'Edit profile'}</button>
        </div>
        <div className="relative mt-7 grid grid-cols-2 gap-2 border-t border-amber-50/10 pt-5 sm:grid-cols-4">
          {[['Visits', String(member.visitCount)], ['Lifetime spend', currency(member.totalSpend)], ['Avg. party', member.averagePartySize ? `${member.averagePartySize.toFixed(1)} guests` : '—'], ['Last visit', member.lastVisitAt ? dateLabel(member.lastVisitAt,{day:'numeric',month:'short'}) : 'Not yet']].map(([label, value]) => <div key={label} className="rounded-xl bg-amber-50/[.055] px-3 py-2.5"><p className="font-mono-label text-[8px] uppercase tracking-[.15em] text-amber-50/45">{label}</p><p className="mt-1 text-sm font-semibold text-amber-50" data-testid={`text-profile-${label.toLowerCase().replaceAll(' ','-')}`}>{value}</p></div>)}
        </div>
      </div>
      {editing && <div className="border-b border-stone-200 bg-[#f4f0e6] p-5 sm:p-7"><div className="mb-5"><p className="font-mono-label text-[9px] uppercase tracking-[.18em] text-emerald-800/65">Member details</p><h2 className="font-editorial mt-1 text-2xl text-emerald-950">A few details to keep current.</h2></div><MemberForm initial={member} saving={update.isPending} submitLabel="Save changes" onCancel={() => setEditing(false)} onSave={data => {
        setError('');
        update.mutate({ memberId, data }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(memberId) }); queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }); setEditing(false); setSuccess('Member details saved.'); window.setTimeout(() => setSuccess(''), 3500); }, onError: () => setError('Your changes weren’t saved. Please try again.') });
      }} /></div>}
    </section>
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
      <section className="rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3"><div><p className="font-mono-label text-[9px] uppercase tracking-[.18em] text-emerald-800/65">A little context</p><h2 className="font-editorial mt-1 text-2xl text-emerald-950">Remember for next time</h2></div><CalendarDays size={18} className="mt-1 text-stone-400" /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#f2eee4] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-stone-500">Birthday</p><p className="mt-2 text-sm font-semibold text-emerald-950" data-testid="text-profile-birthday">{member.birthday ? dateLabel(member.birthday,{day:'numeric',month:'long'}) : 'Not added'}</p></div><div className="rounded-xl bg-[#f2eee4] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-stone-500">Staff notes</p><p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-emerald-950" data-testid="text-profile-notes">{member.notes || 'No notes yet.'}</p></div></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4"><div><p className="text-xs font-semibold text-emerald-950">A note could make their next visit feel personal.</p><p className="mt-1 text-[11px] text-stone-500">Dietary preference, favourite table, or anything useful.</p></div>{!editing && <button onClick={() => setEditing(true)} className="text-xs font-semibold text-emerald-800 underline underline-offset-4" data-testid="button-edit-notes">Update details</button>}</div>
      </section>
      <section>
        {showVisitForm ? <VisitEntry memberId={memberId} onCancel={() => setShowVisitForm(false)} onDone={() => { setSuccess('Visit recorded.'); window.setTimeout(() => setSuccess(''), 3500); setShowVisitForm(false); }} /> : <button onClick={() => setShowVisitForm(true)} className="mb-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#dcb47c] px-5 text-sm font-bold text-emerald-950 shadow-[0_5px_15px_hsl(30_50%_45%/.12)] transition hover:-translate-y-0.5 hover:bg-[#e6c48d]" data-testid="button-open-visit"><CheckCircle2 size={17} /> Record a visit <ArrowRight size={15} /></button>}
        <div className="rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 sm:p-6">
          <div className="mb-4"><p className="font-mono-label text-[9px] uppercase tracking-[.18em] text-emerald-800/65">Time together</p><h2 className="font-editorial mt-1 text-2xl text-emerald-950">Visit history</h2></div>
          {visitQuery.isLoading ? <div className="space-y-3" data-testid="loading-visits"><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : visitQuery.isError ? <ErrorNotice message="Visit history could not be loaded." onRetry={() => visitQuery.refetch()} /> : visitQuery.data?.length ? <div className="space-y-2">{[...visitQuery.data].sort((a,b)=>new Date(b.arrivedAt).getTime()-new Date(a.arrivedAt).getTime()).map((visit,index) => <article key={visit.id} className="relative flex gap-3 rounded-xl bg-[#f3efe5] p-3.5" data-testid={`row-visit-${visit.id}`}><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800"><Clock3 size={15} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-x-2 gap-y-1"><p className="text-xs font-bold text-emerald-950" data-testid={`text-visit-date-${visit.id}`}>{dateLabel(visit.arrivedAt,{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</p><p className="text-xs font-semibold text-emerald-950">{currency(visit.billAmount)}</p></div><p className="mt-1 text-[10px] text-stone-600">{visit.partySize} {visit.partySize === 1 ? 'guest' : 'guests'}{visit.note ? ` · ${visit.note}` : ''}</p></div>{index===0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#e1ebdf] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.1em] text-emerald-800">Latest</span>}</article>)}</div> : <EmptyList title="First visit starts today" detail="There’s no visit history yet. Record a visit when they’re ready." />}
          <p className="mt-4 text-[10px] leading-4 text-stone-500">Any benefits attached to membership tiers remain proposals pending owner approval.</p>
        </div>
      </section>
    </div>
  </div>;
}

function TiersPage() {
  const tiers = [
    { name: 'Member', tone: 'member', label: 'A warm welcome', criteria: ['Starting tier for every new member'], perks: ['Birthday greeting from the team'], icon: Sprout },
    { name: 'Silver', tone: 'silver', label: 'A few good returns', criteria: ['5 visits OR', '3,000,000 VND lifetime spend'], perks: ['Small complimentary item'], icon: Leaf },
    { name: 'Gold', tone: 'gold', label: 'A familiar favourite', criteria: ['12 visits OR', '10,000,000 VND lifetime spend'], perks: ['Birthday treat', 'Booking priority'], icon: BadgeCheck },
  ];
  return <div className="page-enter">
    <PageTitle eyebrow="Garden register / membership" title="A little something for returning." subtitle="A proposal for recognising the guests who make Max Chill part of their routine." />
    <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#b7783d]/25 bg-[#f1dfc4] p-5 sm:flex-row sm:items-center sm:p-6" data-testid="status-tier-draft">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff4df] text-[#955d28]"><ShieldCheck size={21} /></span><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-emerald-950">DRAFT PROPOSAL</p><span className="rounded-full border border-[#9a642e]/25 bg-[#fff4df]/70 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#875721]">Pending owner approval</span></div><p className="mt-1 text-xs leading-5 text-emerald-950/70">Profile labels and dashboard counts preview these proposed thresholds. They are not approved policy, and no suggested benefit is automatically granted.</p></div>
    </section>
    <div className="grid gap-4 lg:grid-cols-3">{tiers.map(({name,tone,label,criteria,perks,icon:Icon},index) => <article key={name} className={`relative overflow-hidden rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 sm:p-6 ${index===0?'lg:mt-6':index===2?'lg:mt-6':''}`} data-testid={`card-proposed-tier-${name.toLowerCase()}`}>
      <div className="absolute right-0 top-0 h-28 w-28 translate-x-9 -translate-y-9 rounded-full border border-emerald-900/[.06]" /><div className="relative flex items-start justify-between"><div><span className={`tier-pill ${tierClass(name)}`} data-testid={`status-proposed-tier-${name.toLowerCase()}`}>{name}</span><h2 className="font-editorial mt-4 text-[1.7rem] leading-tight text-emerald-950">{label}</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7ede2] text-emerald-900"><Icon size={19} /></span></div>
      <div className="relative mt-6 border-t border-stone-200 pt-4"><p className="font-mono-label text-[9px] uppercase tracking-[.16em] text-stone-500">Proposed criteria</p><div className="mt-3 space-y-2">{criteria.map((item,i)=><div className="flex items-center gap-2 text-sm text-emerald-950" key={item}><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e3ebdf] text-emerald-900"><Check size={12} /></span><span>{item}</span></div>)}</div></div>
      <div className="relative mt-5 border-t border-stone-200 pt-4"><p className="font-mono-label text-[9px] uppercase tracking-[.16em] text-stone-500">Suggested service perks</p><div className="mt-3 space-y-2">{perks.map(perk=><div key={perk} className="flex items-center gap-2 text-sm text-stone-700"><span className="h-1.5 w-1.5 rounded-full bg-[#c7834b]" />{perk}</div>)}</div><span className="mt-4 inline-flex rounded-full bg-[#f4e8d7] px-2.5 py-1 text-[9px] font-semibold text-[#8d6037]">Proposed only</span></div>
    </article>)}</div>
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-stone-300/70 bg-white/45 px-5 py-4"><CircleHelp size={17} className="mt-0.5 shrink-0 text-stone-500" /><p className="text-xs leading-5 text-stone-600">Profile labels use the proposed thresholds as a preview. This screen is for discussion only; it does not activate the policy or grant perks, and approval still happens with the owner.</p></div>
  </div>;
}

function Router() {
  return <AppShell><RoutedErrorBoundary><Switch>
    <Route path="/" component={HomePage} />
    <Route path="/dashboard" component={DashboardPage} />
    <Route path="/members" component={MembersPage} />
    <Route path="/members/new" component={NewMemberPage} />
    <Route path="/members/:memberId" component={MemberProfilePage} />
    <Route path="/tiers" component={TiersPage} />
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary></AppShell>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
}
export default App;