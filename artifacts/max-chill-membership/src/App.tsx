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
  { href: '/', label: 'Tra cứu khách', testId: 'quick-check-in', icon: CheckCircle2 },
  { href: '/dashboard', label: 'Tổng quan', testId: 'overview', icon: Sprout },
  { href: '/members', label: 'Thành viên', testId: 'members', icon: UsersRound },
  { href: '/tiers', label: 'Đề xuất hạng', testId: 'tier-proposal', icon: BadgeCheck },
];

function currency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}
function dateLabel(value?: string | null, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return 'Chưa ghi nhận lượt ghé';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', options).format(date);
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map(part => part[0]?.toUpperCase()).join('') || 'M';
}
function tierLabel(tier: string) {
  if (tier === 'Gold') return 'Vàng';
  if (tier === 'Silver') return 'Bạc';
  if (tier === 'Member') return 'Thành viên';
  return tier;
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
          <p className="font-semibold">Chưa tải được dữ liệu</p>
          <p className="mt-1 text-rose-800/80">{message || 'Kiểm tra kết nối rồi thử lại nhé.'}</p>
        </div>
        {onRetry && <button className="font-semibold underline underline-offset-4" onClick={onRetry} data-testid="button-retry">Thử lại</button>}
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
      {health.isLoading ? 'Đang kiểm tra kết nối' : online ? 'Sẵn sàng ghi nhận' : health.isError ? 'Lỗi kết nối dịch vụ' : 'Dịch vụ sẵn sàng'}
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
            <span><span className="block font-editorial text-[21px] leading-none">Max Chill</span><span className="mt-1 block text-[10px] uppercase tracking-[.21em] text-amber-100/55">Thành viên khu vườn</span></span>
          </Link>
        </div>
        <div className="px-7 pb-3"><p className="font-mono-label text-[9px] uppercase tracking-[.2em] text-amber-50/35">Khu vực nhân viên</p></div>
        <nav className="space-y-1 px-3" aria-label="Điều hướng chính">
          {navItems.map(({ href, label, testId, icon: Icon }) => {
            const active = location === href || (href === '/members' && location.startsWith('/members'));
            return <Link key={href} href={href} data-testid={`link-nav-${testId}`} className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] transition ${active ? 'bg-amber-50/10 text-[#f1ca92]' : 'text-amber-50/65 hover:bg-amber-50/[.06] hover:text-amber-50'}`}><Icon size={17} strokeWidth={1.8} />{label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f1ca92]" />}</Link>;
          })}
        </nav>
        <div className="mt-auto px-6 pb-7">
          <div className="rounded-2xl border border-amber-50/10 bg-amber-50/[.045] p-4">
            <MapPin size={16} className="mb-3 text-[#e7bd80]" />
            <p className="text-sm font-medium">Một góc nhỏ để thư thái.</p>
            <p className="mt-1 text-[11px] leading-5 text-amber-50/50">Chào đón khách quay lại khu vườn, qua từng lần ghé thăm.</p>
          </div>
          <div className="mt-4 px-1"><ServicePulse /></div>
        </div>
      </aside>
      <div className="lg:pl-[258px]">
        <header className="sticky top-0 z-20 border-b border-stone-300/60 bg-[#f4f0e6]/95 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5" data-testid="link-mobile-brand">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900 text-amber-100"><Leaf size={19} /></span>
              <span><span className="block font-editorial text-lg leading-none text-emerald-950">Max Chill</span><span className="mt-1 block text-[9px] uppercase tracking-[.16em] text-stone-500">Thành viên khu vườn</span></span>
            </Link>
            <button aria-label="Mở hoặc đóng điều hướng" onClick={() => setMobileOpen(!mobileOpen)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 text-emerald-950" data-testid="button-mobile-menu">{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
          </div>
          {mobileOpen && <nav className="grid grid-cols-2 gap-2 border-t border-stone-300/70 px-4 py-3" aria-label="Điều hướng trên điện thoại">{navItems.map(({ href, label, testId, icon: Icon }) => <Link key={href} href={href} data-testid={`link-mobile-${testId}`} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${location === href || (href === '/members' && location.startsWith('/members')) ? 'bg-emerald-900 text-amber-50' : 'bg-white/60 text-emerald-950'}`}><Icon size={15} />{label}</Link>)}<div className="col-span-2 px-1 pt-1"><ServicePulse /></div></nav>}
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
      onError: () => setError('Chưa lưu được lượt ghé. Vui lòng thử lại.'),
    });
  };
  return (
    <div className={`rounded-2xl border border-emerald-900/10 bg-[#faf7ef] ${compact ? 'p-4' : 'p-5 sm:p-6'}`} data-testid="panel-visit-entry">
      <div className="mb-4 flex items-start justify-between">
        <div><p className="font-mono-label text-[9px] uppercase tracking-[.18em] text-emerald-800/65">Thông tin lượt ghé</p><h3 className="font-editorial mt-1 text-xl text-emerald-950">Ghi lại lần ghé hôm nay</h3></div>
        {onCancel && <button onClick={onCancel} aria-label="Đóng biểu mẫu lượt ghé" className="rounded-lg p-2 text-stone-500 hover:bg-stone-200" data-testid="button-cancel-visit"><X size={17} /></button>}
      </div>
      {success ? <div role="status" className="flex items-center gap-3 rounded-xl bg-[#e4efe2] p-4 text-sm font-medium text-emerald-950" data-testid="status-visit-success"><CheckCircle2 size={19} />Đã ghi nhận lượt ghé. Cảm ơn bạn đã chăm sóc khách quen.</div> : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-stone-700">Số khách
              <input required type="number" min="1" max="50" value={partySize} onChange={e => setPartySize(e.target.value)} className="form-control mt-1.5" data-testid="input-party-size" />
            </label>
            <label className="block text-xs font-semibold text-stone-700">Giá trị hóa đơn <span className="font-normal text-stone-500">(₫)</span>
              <input type="number" min="0" step="1000" value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder="Không bắt buộc" className="form-control mt-1.5" data-testid="input-bill-amount" />
            </label>
          </div>
          <label className="block text-xs font-semibold text-stone-700">Ghi chú <span className="font-normal text-stone-500">(không bắt buộc)</span>
            <input value={note} onChange={e => setNote(e.target.value)} maxLength={2000} placeholder="Chi tiết đáng lưu ý" className="form-control mt-1.5" data-testid="input-visit-note" />
          </label>
          {error && <p className="text-xs font-medium text-rose-800" role="alert" data-testid="status-visit-error">{error}</p>}
          <div className="flex gap-2">
            <button disabled={mutation.isPending} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 text-sm font-semibold text-amber-50 transition hover:bg-emerald-800 disabled:opacity-60" data-testid="button-save-visit">{mutation.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} Ghi nhận lượt ghé</button>
            {onCancel && <button type="button" onClick={onCancel} className="rounded-xl border border-stone-300 px-4 text-sm font-semibold text-stone-600" data-testid="button-dismiss-visit">Hủy</button>}
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
        <div><p className="font-mono-label text-[10px] uppercase tracking-[.2em] text-emerald-800/70">Max Chill Garden · Khu vực nhân viên</p><h1 className="font-editorial mt-2 text-[2.6rem] leading-[1.05] tracking-[-.04em] text-emerald-950 sm:text-5xl">Gặp lại khách quen.<br className="sm:hidden" /> Đón tiếp nồng hậu hơn.</h1><p className="mt-3 max-w-lg text-sm leading-6 text-stone-600">Tra cứu bằng số điện thoại và ghi nhận lượt ghé chỉ trong vài giây.</p></div>
        <div className="hidden items-center gap-2 rounded-full border border-emerald-900/10 bg-white/55 px-3 py-2 text-[11px] text-emerald-900/70 sm:flex"><Clock3 size={14} />Thao tác gọn nhẹ giữa ca</div>
      </div>
      <section className="relative overflow-hidden rounded-[28px] bg-emerald-950 text-amber-50 shadow-[0_20px_65px_hsl(158_30%_22%/.13)]">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-amber-50/[.08]" /><div className="absolute -right-2 -top-10 h-48 w-48 rounded-full border border-amber-50/[.08]" />
        <div className="relative grid lg:grid-cols-[1.05fr_.95fr]">
          <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-11">
            <div className="mb-7 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#dfb980]"><Search size={14} /> Tra cứu thành viên</div>
            <label className="mb-2 block text-xs text-amber-50/70" htmlFor="phone-search">Số điện thoại</label>
            <div className="flex items-center rounded-2xl border border-amber-50/15 bg-amber-50/[.08] px-4 transition focus-within:border-[#dfb980]/75 focus-within:bg-amber-50/[.12]">
              <span className="mr-3 font-mono-label text-sm text-amber-50/50">+84</span>
              <input id="phone-search" type="tel" value={phone} onChange={e => { setPhone(e.target.value); setActiveMember(null); }} placeholder="Nhập số điện thoại khách" className="h-[58px] min-w-0 flex-1 bg-transparent text-lg text-amber-50 outline-none placeholder:text-amber-50/30" data-testid="input-phone-lookup" />
              {phone && <button onClick={() => { setPhone(''); setActiveMember(null); }} aria-label="Xóa nội dung tìm kiếm" className="rounded-lg p-2 text-amber-50/55 hover:bg-white/10" data-testid="button-clear-search"><X size={16} /></button>}
            </div>
            <div className="mt-5 flex items-center gap-2 text-[11px] text-amber-50/50"><ShieldCheck size={14} className="text-[#d6b96b]" />Dùng số điện thoại khách đã đăng ký.</div>
            <div className="mt-8 border-t border-amber-50/10 pt-5">
              <p className="text-sm text-amber-50/65">Khách mới đến lần đầu?</p>
              <Link href="/members/new" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#f0c68b] hover:text-amber-100" data-testid="link-register-member"><Plus size={16} /> Đăng ký thành viên mới <ArrowRight size={15} /></Link>
            </div>
          </div>
          <div className="border-t border-amber-50/10 bg-[#123e31]/60 px-5 py-6 sm:px-8 lg:border-l lg:border-t-0 lg:px-9 lg:py-10">
            {!hasQuery ? (
              <div className="flex h-full min-h-[225px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] border border-amber-50/10 bg-amber-50/[.055] text-[#e0bb82]"><UsersRound size={23} strokeWidth={1.5} /></div>
                <p className="font-editorial text-[22px] text-amber-50/90">Lời chào tiếp theo bắt đầu từ đây.</p><p className="mt-2 max-w-[250px] text-xs leading-5 text-amber-50/50">Tìm số điện thoại khách đã đăng ký để xem đúng hồ sơ.</p>
              </div>
            ) : result.isLoading ? (
              <div className="space-y-4 py-2" data-testid="loading-member-lookup"><Skeleton className="h-5 w-32" /><Skeleton className="h-24 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : result.isError ? <ErrorNotice message="Chưa thể tra cứu thành viên." onRetry={() => result.refetch()} /> : bestMatch ? (
              <div className="animate-in">
                <div className="mb-5 flex items-center justify-between"><p className="font-mono-label text-[10px] uppercase tracking-[.18em] text-amber-50/50">Thông tin khách</p><span className={`tier-pill ${tierClass(bestMatch.tier)}`} data-testid={`status-member-tier-${bestMatch.id}`}>{tierLabel(bestMatch.tier)}</span></div>
                <div className="mb-5 flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#d8a76a] font-editorial text-xl text-emerald-950" data-testid={`avatar-member-${bestMatch.id}`}>{initials(bestMatch.fullName)}</span>
                  <div><Link href={`/members/${bestMatch.id}`} className="font-editorial text-2xl tracking-[-.02em] text-amber-50 hover:text-[#f0c68b]" data-testid={`link-member-profile-${bestMatch.id}`}>{bestMatch.fullName}</Link><p className="mt-1 font-mono-label text-[11px] text-amber-50/55" data-testid={`text-member-phone-${bestMatch.id}`}>{bestMatch.phone}</p></div>
                </div>
                <div className="mb-5 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-amber-50/[.09] bg-amber-50/[.045] px-3 py-2.5"><p className="font-mono-label text-[9px] uppercase tracking-[.14em] text-amber-50/45">Lượt ghé</p><p className="mt-1 text-lg font-semibold" data-testid={`text-visit-count-${bestMatch.id}`}>{bestMatch.visitCount}</p></div>
                  <div className="rounded-xl border border-amber-50/[.09] bg-amber-50/[.045] px-3 py-2.5"><p className="font-mono-label text-[9px] uppercase tracking-[.14em] text-amber-50/45">Ghé gần nhất</p><p className="mt-1 text-sm font-semibold" data-testid={`text-last-visit-${bestMatch.id}`}>{bestMatch.lastVisitAt ? dateLabel(bestMatch.lastVisitAt, { day: 'numeric', month: 'short' }) : 'Lần ghé đầu tiên'}</p></div>
                </div>
                {activeMember === bestMatch.id ? <VisitEntry compact memberId={bestMatch.id} onCancel={() => setActiveMember(null)} onDone={() => window.setTimeout(() => setActiveMember(null), 1700)} /> : <button onClick={() => setActiveMember(bestMatch.id)} className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#e6bd81] px-4 text-sm font-bold text-emerald-950 transition hover:bg-[#f0ca91]" data-testid={`button-checkin-${bestMatch.id}`}><CheckCircle2 size={17} /> Ghi nhận lượt ghé hôm nay <ArrowRight size={15} /></button>}
                {!exactPhone && results.length > 1 && <p className="mt-3 text-center text-[10px] text-amber-50/45">Kết quả gần khớp nhất · {results.length} kết quả</p>}
              </div>
            ) : <div className="flex min-h-[225px] flex-col justify-center">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50/[.08] text-[#dfb980]"><Search size={20} /></div><p className="font-editorial text-[22px] text-amber-50">Chưa tìm thấy khách này.</p><p className="mt-2 max-w-xs text-xs leading-5 text-amber-50/55">Không tìm thấy số điện thoại này. Hãy kiểm tra lại hoặc đăng ký khách mới.</p>
              <div className="mt-5 flex flex-wrap gap-2"><Link href="/members/new" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#e6bd81] px-3 text-xs font-bold text-emerald-950" data-testid="link-register-from-lookup"><Plus size={15} /> Đăng ký thành viên</Link><button onClick={() => setPhone('')} className="rounded-xl border border-amber-50/15 px-3 text-xs font-semibold text-amber-50/75" data-testid="button-try-another">Thử số khác</button></div>
            </div>}
          </div>
        </div>
      </section>
      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex items-start gap-3 rounded-2xl border border-stone-300/70 bg-[#fbf8f0]/75 px-4 py-4 sm:px-5"><span className="mt-0.5 text-emerald-800"><Sprout size={18} /></span><div><p className="text-sm font-semibold text-emerald-950">Gợi ý trong ca</p><p className="mt-1 text-xs leading-5 text-stone-600">Ghi nhận lượt ghé khi khách còn ở quán. Số khách và hóa đơn giúp lần đón tiếp sau chu đáo hơn.</p></div></div>
        <ButtonLink href="/members" secondary testId="link-all-members">Xem danh sách thành viên <ArrowRight size={15} /></ButtonLink>
      </div>
    </div>
  );
}

function DashboardPage() {
  const dashboard = useGetDashboard();
  const stats = dashboard.data;
  if (dashboard.isLoading) return <div className="page-enter"><PageTitle eyebrow="Tổng quan thành viên" title="Khu vườn qua một ánh nhìn." subtitle="Tóm tắt cộng đồng khách quen đang gắn bó với Max Chill." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map(n => <Skeleton key={n} className="h-32" />)}<Skeleton className="col-span-full h-72" /></div></div>;
  if (dashboard.isError || !stats) return <div className="page-enter"><PageTitle eyebrow="Tổng quan thành viên" title="Khu vườn qua một ánh nhìn." subtitle="Tóm tắt cộng đồng khách quen đang gắn bó với Max Chill." /><ErrorNotice message="Chưa tải được số liệu thành viên." onRetry={() => dashboard.refetch()} /></div>;
  const capacityUsed = stats.pilotCapacity.limit > 0 ? Math.max(0, Math.min(100, ((stats.pilotCapacity.limit - stats.pilotCapacity.remaining) / stats.pilotCapacity.limit) * 100)) : 0;
  const statCards = [
    { label: 'Tổng thành viên', value: stats.totalMembers, icon: UsersRound, note: 'Tất cả khách đã đăng ký', accent: 'bg-[#e6efe1] text-emerald-900' },
    { label: 'Thành viên mới', value: stats.newMembers, icon: ArrowUpRight, note: 'Khách mới được chào đón', accent: 'bg-[#fae9d2] text-[#9a542f]' },
    { label: 'Khách quay lại', value: stats.returningMembers, icon: ArrowDownRight, note: 'Đã ghé hơn một lần', accent: 'bg-[#e7ece5] text-[#49634e]' },
    { label: 'Hạng Bạc · Vàng', value: stats.silverMembers + stats.goldMembers, icon: BadgeCheck, note: `${stats.silverMembers} Bạc · ${stats.goldMembers} Vàng`, accent: 'bg-[#f4e4c8] text-[#805d2d]' },
  ];
  return (
    <div className="page-enter">
      <PageTitle eyebrow="Danh sách thành viên / tổng quan" title="Khu vườn qua một ánh nhìn." subtitle="Tóm tắt cộng đồng khách quen đang gắn bó với Max Chill." action={<ButtonLink href="/members/new" testId="link-add-member"><Plus size={16} /> Thêm thành viên</ButtonLink>} />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Thống kê thành viên">
        {statCards.map(({ label, value, icon: Icon, note, accent }, i) => <article key={label} className="rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 shadow-[0_5px_18px_hsl(40_24%_40%/.04)]" data-testid={`card-stat-${i}`}>
          <div className="flex items-start justify-between"><p className="text-xs font-semibold text-stone-600">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}><Icon size={17} /></span></div>
          <p className="font-editorial mt-4 text-[2rem] leading-none text-emerald-950" data-testid={`text-stat-${i}`}>{value.toLocaleString()}</p><p className="mt-2 text-[11px] text-stone-500">{note}</p>
        </article>)}
      </section>
      <section className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4"><div><p className="font-mono-label text-[9px] uppercase tracking-[.18em] text-emerald-800/65">Khách quen</p><h2 className="font-editorial mt-1 text-2xl text-emerald-950">Ghé nhiều nhất</h2></div><span className="rounded-full bg-emerald-900/[.07] px-3 py-1 text-[10px] font-semibold text-emerald-900">Từ trước đến nay</span></div>
          {stats.topByVisits.length ? <div className="divide-y divide-stone-200/75">{stats.topByVisits.map((member, index) => <Link href={`/members/${member.id}`} key={member.id} className="group flex items-center gap-3 py-3.5" data-testid={`row-top-visits-${member.id}`}>
            <span className="font-mono-label w-5 text-xs text-stone-400">0{index + 1}</span><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#e8ede3] font-editorial text-sm text-emerald-900">{initials(member.fullName)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-emerald-950 group-hover:text-emerald-700">{member.fullName}</span><span className="mt-1 block font-mono-label text-[9px] text-stone-500">Hạng {tierLabel(member.tier)}</span></span><span className="text-right"><span className="block text-sm font-bold text-emerald-950" data-testid={`text-top-visits-count-${member.id}`}>{member.visitCount}</span><span className="text-[9px] text-stone-500">lượt ghé</span></span><ChevronRight size={15} className="text-stone-400 transition group-hover:translate-x-1" />
          </Link>)}</div> : <EmptyList title="Chưa có lượt ghé để xếp hạng" detail="Khi khách quay lại, danh sách khách quen sẽ xuất hiện tại đây." />}
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-[#dfb67d] p-5 text-emerald-950 sm:p-6">
            <p className="font-mono-label text-[9px] uppercase tracking-[.18em] text-emerald-950/60">Sức chứa đợt thử nghiệm</p><div className="mt-3 flex items-end justify-between"><div><p className="font-editorial text-[2.8rem] leading-none" data-testid="text-capacity-remaining">{stats.pilotCapacity.remaining}</p><p className="mt-2 text-xs text-emerald-950/70">suất còn lại</p></div><p className="pb-1 text-sm font-semibold">Tổng {stats.pilotCapacity.limit} suất</p></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-emerald-950/15"><div className="h-full rounded-full bg-emerald-950 transition-all" style={{ width: `${capacityUsed}%` }} /></div><div className="mt-2 flex justify-between text-[10px] text-emerald-950/65"><span>Đã chào đón {Math.round(capacityUsed)}%</span><span>Đợt thành viên đầu tiên</span></div>
          </div>
          <div className="flex-1 rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2"><Wallet size={16} className="text-[#a55b3b]" /><div><p className="font-mono-label text-[9px] uppercase tracking-[.16em] text-stone-500">Chi tiêu cao nhất</p><h2 className="font-editorial text-xl text-emerald-950">Khách ủng hộ nhiều nhất</h2></div></div>
            {stats.topBySpend.length ? <div className="space-y-3">{stats.topBySpend.slice(0, 4).map(member => <Link key={member.id} href={`/members/${member.id}`} className="flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-stone-100/80" data-testid={`row-top-spend-${member.id}`}><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f4e4d5] font-editorial text-xs text-[#9a542f]">{initials(member.fullName)}</span><span className="min-w-0 flex-1 truncate text-xs font-semibold text-emerald-950">{member.fullName}</span><span className="text-xs font-semibold text-stone-700" data-testid={`text-spend-total-${member.id}`}>{currency(member.totalSpend)}</span></Link>)}</div> : <EmptyList title="Chưa có thông tin chi tiêu" detail="Tổng hóa đơn của mỗi thành viên sẽ được cộng dồn theo thời gian." />}
          </div>
        </div>
      </section>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-900/10 bg-emerald-900/[.045] px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/75 text-emerald-900"><Leaf size={17} /></span><div><p className="text-sm font-semibold text-emerald-950">Đón tiếp thật thân tình.</p><p className="text-xs text-stone-600">Một ghi chú nhỏ hôm nay giúp lần sau thêm gần gũi.</p></div></div><ButtonLink href="/" secondary testId="link-start-checkin">Tra cứu khách <ArrowRight size={14} /></ButtonLink></div>
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
      <PageTitle eyebrow="Danh sách thành viên" title="Rất vui được gặp lại." subtitle="Tìm khách quen, xem hạng thành viên hoặc chào đón người mới." action={<ButtonLink href="/members/new" testId="link-new-member"><Plus size={16} /> Đăng ký thành viên</ButtonLink>} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-[420px]"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" /><input type="search" placeholder="Tìm theo tên hoặc số điện thoại" value={search} onChange={e => setSearch(e.target.value)} className="form-control h-12 pl-11" data-testid="input-member-search" /></label>
        {!members.isLoading && !members.isError && <p className="text-xs text-stone-500" data-testid="text-member-results">Tìm thấy {members.data?.length ?? 0} thành viên</p>}
      </div>
      {members.isLoading ? <div className="space-y-3" data-testid="loading-members">{[1,2,3,4].map(n => <Skeleton key={n} className="h-[76px]" />)}</div> : members.isError ? <ErrorNotice message="Chưa tải được danh sách thành viên." onRetry={() => members.refetch()} /> : members.data?.length ? (
        <div className="overflow-hidden rounded-2xl border border-stone-300/80 bg-[#fbf8f0]">
          <div className="hidden grid-cols-[minmax(220px,1.5fr)_1fr_.7fr_.8fr_24px] gap-4 border-b border-stone-200 bg-[#f5f0e5] px-5 py-3 font-mono-label text-[9px] uppercase tracking-[.14em] text-stone-500 md:grid"><span>Thành viên</span><span>Hạng</span><span>Lượt ghé</span><span>Ghé gần nhất</span><span /></div>
          {members.data.map(member => <Link key={member.id} href={`/members/${member.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-stone-200/75 px-4 py-4 transition hover:bg-[#f4f0e6] last:border-b-0 sm:px-5 md:grid-cols-[minmax(220px,1.5fr)_1fr_.7fr_.8fr_24px] md:gap-4" data-testid={`row-member-${member.id}`}>
            <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#e8ede3] font-editorial text-sm text-emerald-900">{initials(member.fullName)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-emerald-950">{member.fullName}</span><span className="mt-1 block font-mono-label text-[10px] text-stone-500">{member.phone}</span></span></span>
            <span className="hidden md:block"><span className={`tier-pill ${tierClass(member.tier)}`} data-testid={`status-member-tier-${member.id}`}>{tierLabel(member.tier)}</span></span>
            <span className="text-right text-xs font-semibold text-emerald-950 md:text-left">{member.visitCount}<span className="ml-1 font-normal text-stone-500 md:hidden">lượt ghé ·</span></span>
            <span className="col-start-1 text-[10px] text-stone-500 md:col-start-auto md:text-xs" data-testid={`text-member-last-visit-${member.id}`}>{member.lastVisitAt ? `Ghé gần nhất ${dateLabel(member.lastVisitAt,{day:'numeric',month:'short',year:'numeric'})}` : 'Chưa có lượt ghé'}</span>
            <ChevronRight size={16} className="col-start-2 row-start-1 text-stone-400 md:col-start-auto md:row-start-auto" />
            <span className={`tier-pill col-start-2 row-start-2 justify-self-end md:hidden ${tierClass(member.tier)}`}>{tierLabel(member.tier)}</span>
          </Link>)}
        </div>
      ) : <EmptyList title={search ? 'Không tìm thấy thành viên phù hợp' : 'Danh sách đang chờ thành viên đầu tiên'} detail={search ? 'Thử tìm bằng tên hoặc số điện thoại khác.' : 'Đăng ký khách đầu tiên để hồ sơ xuất hiện tại đây.'} />}
      <p className="mt-4 text-[11px] text-stone-500">Hạng hiển thị theo dữ liệu thành viên hiện tại. Quyền lợi đề xuất chưa được tự động áp dụng.</p>
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
    if (phone.replace(/\D/g, '').length < 8) { setIssue('Vui lòng nhập số điện thoại có ít nhất 8 chữ số.'); return; }
    setIssue('');
    onSave({ fullName: fullName.trim(), phone: phone.trim(), birthday: birthday || null, notes: notes.trim() || null });
  };
  return <form onSubmit={submit} className="space-y-5" data-testid="form-member">
    <label className="block text-xs font-semibold text-emerald-950">Họ và tên <span className="text-[#b75e3c]">*</span><input required maxLength={120} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Tên khách thường dùng" className="form-control mt-2" data-testid="input-member-name" /></label>
    <label className="block text-xs font-semibold text-emerald-950">Số điện thoại <span className="text-[#b75e3c]">*</span><input required type="tel" minLength={8} maxLength={20} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+84 90 123 4567" className="form-control mt-2" data-testid="input-member-phone" /><span className="mt-1.5 block font-normal text-stone-500">Dùng để nhận ra khách khi quay lại.</span></label>
    <label className="block text-xs font-semibold text-emerald-950">Ngày sinh <span className="font-normal text-stone-500">(không bắt buộc)</span><input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="form-control mt-2" data-testid="input-member-birthday" /></label>
    <label className="block text-xs font-semibold text-emerald-950">Ghi chú <span className="font-normal text-stone-500">(không bắt buộc)</span><textarea maxLength={2000} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Sở thích hoặc điều cần nhớ" className="form-control mt-2 resize-y py-3" data-testid="input-member-notes" /></label>
    {issue && <p className="text-xs font-medium text-rose-800" role="alert" data-testid="status-form-error">{issue}</p>}
    <div className="flex flex-col-reverse gap-2 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end">{onCancel && <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-stone-300 px-5 text-sm font-semibold text-stone-700 hover:bg-stone-100" data-testid="button-cancel-member">Hủy</button>}<button disabled={saving} type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 text-sm font-semibold text-amber-50 hover:bg-emerald-800 disabled:opacity-60" data-testid="button-submit-member">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{submitLabel}</button></div>
  </form>;
}

function NewMemberPage() {
  const create = useCreateMember();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [error, setError] = useState('');
  return <div className="page-enter">
    <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-emerald-900" data-testid="link-back-home"><ArrowLeft size={15} /> Quay lại tra cứu khách</Link>
    <PageTitle eyebrow="Đăng ký thành viên" title="Lưu lại thông tin khách quen." subtitle="Thêm tên và số điện thoại để nhân viên nhận ra khách trong lần ghé tiếp theo." />
    <div className="grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 sm:p-7">
        {error && <div className="mb-5"><ErrorNotice message={error} /></div>}
        <MemberForm saving={create.isPending} submitLabel="Đăng ký thành viên" onSave={data => {
          setError('');
          create.mutate({ data: { ...data, joinedAt: new Date().toISOString() } }, {
            onSuccess: member => { queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setLocation(`/members/${member.id}`); },
            onError: () => setError('Chưa đăng ký được thành viên. Hãy kiểm tra thông tin rồi thử lại.'),
          });
        }} />
      </section>
      <aside className="h-fit rounded-2xl bg-[#e3ebdf] p-5 text-emerald-950">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-emerald-900"><Sprout size={19} /></span><p className="font-editorial mt-4 text-xl">Chỉ lưu những điều cần nhớ.</p><p className="mt-2 text-xs leading-5 text-emerald-950/70">Số điện thoại giúp tìm lại hồ sơ. Ngày sinh và ghi chú là tùy chọn, giúp lần đón tiếp sau chu đáo hơn.</p><div className="mt-5 border-t border-emerald-900/10 pt-4 text-[10px] leading-5 text-emerald-950/60">Thành viên mới bắt đầu ở hạng Thành viên. Hạng Bạc/Vàng chỉ đang xem trước ngưỡng đề xuất; quyền lợi chưa áp dụng.</div>
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
   if (!validId) return <ErrorNotice message="Đường dẫn thành viên không hợp lệ." />;
  if (memberQuery.isLoading) return <div className="page-enter"><Skeleton className="mb-5 h-7 w-28" /><Skeleton className="h-56 w-full" /><Skeleton className="mt-5 h-64 w-full" /></div>;
   if (memberQuery.isError || !memberQuery.data) return <div className="page-enter"><Link href="/members" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-stone-600" data-testid="link-back-members"><ArrowLeft size={15} /> Thành viên</Link><ErrorNotice message="Không tìm thấy hồ sơ thành viên này." onRetry={() => memberQuery.refetch()} /></div>;
  const member = memberQuery.data;
  return <div className="page-enter">
     <Link href="/members" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-emerald-900" data-testid="link-back-members"><ArrowLeft size={15} /> Danh sách thành viên</Link>
    {success && <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#e3efe1] px-4 py-3 text-sm font-medium text-emerald-900" role="status" data-testid="status-member-saved"><CheckCircle2 size={16} />{success}</div>}
    {error && <div className="mb-4"><ErrorNotice message={error} /></div>}
    <section className="overflow-hidden rounded-[26px] border border-stone-300/75 bg-[#fbf8f0]">
      <div className="relative bg-emerald-950 px-5 py-7 text-amber-50 sm:px-8 sm:py-9">
        <div className="absolute -right-6 -top-20 h-52 w-52 rounded-full border border-amber-50/[.09]" /><div className="absolute right-12 -top-8 h-32 w-32 rounded-full border border-amber-50/[.08]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[24px] bg-[#d8a76a] font-editorial text-[26px] text-emerald-950" data-testid={`avatar-profile-${member.id}`}>{initials(member.fullName)}</span>
           <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h1 className="font-editorial text-[2rem] leading-tight tracking-[-.025em] sm:text-[2.5rem]" data-testid="text-profile-name">{member.fullName}</h1><span className={`tier-pill ${tierClass(member.tier)}`} data-testid="status-profile-tier">{tierLabel(member.tier)}</span></div><p className="mt-2 font-mono-label text-xs text-amber-50/60" data-testid="text-profile-phone">{member.phone}</p><p className="mt-1 text-xs text-amber-50/50">Thành viên từ {dateLabel(member.joinedAt)}</p></div>
           <button onClick={() => { setEditing(!editing); setShowVisitForm(false); }} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-amber-50/20 px-4 text-xs font-semibold text-amber-50 hover:bg-amber-50/10 sm:self-center" data-testid="button-edit-member">{editing ? <X size={15} /> : <span className="text-base leading-none">+</span>}{editing ? 'Đóng chỉnh sửa' : 'Sửa hồ sơ'}</button>
        </div>
        <div className="relative mt-7 grid grid-cols-2 gap-2 border-t border-amber-50/10 pt-5 sm:grid-cols-4">
          {[[`Lượt ghé`, String(member.visitCount)], ['Tổng chi tiêu', currency(member.totalSpend)], ['Số khách trung bình', member.averagePartySize ? `${member.averagePartySize.toFixed(1)} khách` : '—'], ['Lần ghé gần nhất', member.lastVisitAt ? dateLabel(member.lastVisitAt,{day:'numeric',month:'short'}) : 'Chưa có']].map(([label, value]) => <div key={label} className="rounded-xl bg-amber-50/[.055] px-3 py-2.5"><p className="font-mono-label text-[8px] uppercase tracking-[.15em] text-amber-50/45">{label}</p><p className="mt-1 text-sm font-semibold text-amber-50" data-testid={`text-profile-${label.toLowerCase().replaceAll(' ','-')}`}>{value}</p></div>)}
        </div>
      </div>
      {editing && <div className="border-b border-stone-200 bg-[#f4f0e6] p-5 sm:p-7"><div className="mb-5"><p className="font-mono-label text-[9px] uppercase tracking-[.18em] text-emerald-800/65">Thông tin thành viên</p><h2 className="font-editorial mt-1 text-2xl text-emerald-950">Cập nhật thông tin khách.</h2></div><MemberForm initial={member} saving={update.isPending} submitLabel="Lưu thay đổi" onCancel={() => setEditing(false)} onSave={data => {
        setError('');
        update.mutate({ memberId, data }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(memberId) }); queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }); setEditing(false); setSuccess('Đã lưu thông tin thành viên.'); window.setTimeout(() => setSuccess(''), 3500); }, onError: () => setError('Chưa lưu được thay đổi. Vui lòng thử lại.') });
      }} /></div>}
    </section>
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
      <section className="rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3"><div><p className="font-mono-label text-[9px] uppercase tracking-[.18em] text-emerald-800/65">Thông tin thêm</p><h2 className="font-editorial mt-1 text-2xl text-emerald-950">Lưu ý cho lần ghé sau</h2></div><CalendarDays size={18} className="mt-1 text-stone-400" /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#f2eee4] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-stone-500">Ngày sinh</p><p className="mt-2 text-sm font-semibold text-emerald-950" data-testid="text-profile-birthday">{member.birthday ? dateLabel(member.birthday,{day:'numeric',month:'long'}) : 'Chưa cập nhật'}</p></div><div className="rounded-xl bg-[#f2eee4] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-stone-500">Ghi chú nhân viên</p><p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-emerald-950" data-testid="text-profile-notes">{member.notes || 'Chưa có ghi chú.'}</p></div></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4"><div><p className="text-xs font-semibold text-emerald-950">Một ghi chú nhỏ giúp lần ghé sau thân tình hơn.</p><p className="mt-1 text-[11px] text-stone-500">Sở thích ăn uống, bàn yêu thích hoặc thông tin hữu ích khác.</p></div>{!editing && <button onClick={() => setEditing(true)} className="text-xs font-semibold text-emerald-800 underline underline-offset-4" data-testid="button-edit-notes">Cập nhật thông tin</button>}</div>
      </section>
      <section>
        {showVisitForm ? <VisitEntry memberId={memberId} onCancel={() => setShowVisitForm(false)} onDone={() => { setSuccess('Đã ghi nhận lượt ghé.'); window.setTimeout(() => setSuccess(''), 3500); setShowVisitForm(false); }} /> : <button onClick={() => setShowVisitForm(true)} className="mb-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#dcb47c] px-5 text-sm font-bold text-emerald-950 shadow-[0_5px_15px_hsl(30_50%_45%/.12)] transition hover:-translate-y-0.5 hover:bg-[#e6c48d]" data-testid="button-open-visit"><CheckCircle2 size={17} /> Ghi nhận lượt ghé <ArrowRight size={15} /></button>}
        <div className="rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 sm:p-6">
          <div className="mb-4"><p className="font-mono-label text-[9px] uppercase tracking-[.18em] text-emerald-800/65">Lịch sử gắn bó</p><h2 className="font-editorial mt-1 text-2xl text-emerald-950">Lịch sử lượt ghé</h2></div>
          {visitQuery.isLoading ? <div className="space-y-3" data-testid="loading-visits"><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : visitQuery.isError ? <ErrorNotice message="Chưa tải được lịch sử lượt ghé." onRetry={() => visitQuery.refetch()} /> : visitQuery.data?.length ? <div className="space-y-2">{[...visitQuery.data].sort((a,b)=>new Date(b.arrivedAt).getTime()-new Date(a.arrivedAt).getTime()).map((visit,index) => <article key={visit.id} className="relative flex gap-3 rounded-xl bg-[#f3efe5] p-3.5" data-testid={`row-visit-${visit.id}`}><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-800"><Clock3 size={15} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-x-2 gap-y-1"><p className="text-xs font-bold text-emerald-950" data-testid={`text-visit-date-${visit.id}`}>{dateLabel(visit.arrivedAt,{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</p><p className="text-xs font-semibold text-emerald-950">{currency(visit.billAmount)}</p></div><p className="mt-1 text-[10px] text-stone-600">{visit.partySize} {visit.partySize === 1 ? 'khách' : 'khách'}{visit.note ? ` · ${visit.note}` : ''}</p></div>{index===0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#e1ebdf] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[.1em] text-emerald-800">Gần nhất</span>}</article>)}</div> : <EmptyList title="Lượt ghé đầu tiên có thể bắt đầu hôm nay" detail="Chưa có lịch sử lượt ghé. Hãy ghi nhận khi khách đến quán." />}
          <p className="mt-4 text-[10px] leading-4 text-stone-500">Quyền lợi theo hạng thành viên vẫn là đề xuất, chờ chủ quán duyệt.</p>
        </div>
      </section>
    </div>
  </div>;
}

function TiersPage() {
  const tiers = [
    { name: 'Member', tone: 'member', label: 'Chào đón thân tình', criteria: ['Hạng khởi đầu cho mọi thành viên mới'], perks: ['Lời chúc mừng sinh nhật từ nhân viên'], icon: Sprout },
    { name: 'Silver', tone: 'silver', label: 'Thêm nhiều lần ghé', criteria: ['Từ 5 lượt ghé', 'Hoặc chi tiêu tích lũy từ 3.000.000 ₫'], perks: ['Tặng một món nhỏ'], icon: Leaf },
    { name: 'Gold', tone: 'gold', label: 'Khách quen thân thiết', criteria: ['Từ 12 lượt ghé', 'Hoặc chi tiêu tích lũy từ 10.000.000 ₫'], perks: ['Ưu đãi sinh nhật', 'Ưu tiên đặt bàn'], icon: BadgeCheck },
  ];
  return <div className="page-enter">
    <PageTitle eyebrow="Chương trình thành viên" title="Tri ân khách quay lại." subtitle="Đề xuất ghi nhận những vị khách đã chọn Max Chill làm điểm hẹn quen thuộc." />
    <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#b7783d]/25 bg-[#f1dfc4] p-5 sm:flex-row sm:items-center sm:p-6" data-testid="status-tier-draft">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff4df] text-[#955d28]"><ShieldCheck size={21} /></span><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-emerald-950">ĐỀ XUẤT BẢN NHÁP</p><span className="rounded-full border border-[#9a642e]/25 bg-[#fff4df]/70 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#875721]">Chờ chủ quán duyệt</span></div><p className="mt-1 text-xs leading-5 text-emerald-950/70">Nhãn hồ sơ và số liệu trên tổng quan đang xem trước các ngưỡng đề xuất. Đây chưa phải chính sách được duyệt và quyền lợi chưa tự động áp dụng.</p></div>
    </section>
    <div className="grid gap-4 lg:grid-cols-3">{tiers.map(({name,tone,label,criteria,perks,icon:Icon},index) => <article key={name} className={`relative overflow-hidden rounded-2xl border border-stone-300/75 bg-[#fbf8f0] p-5 sm:p-6 ${index===0?'lg:mt-6':index===2?'lg:mt-6':''}`} data-testid={`card-proposed-tier-${name.toLowerCase()}`}>
      <div className="absolute right-0 top-0 h-28 w-28 translate-x-9 -translate-y-9 rounded-full border border-emerald-900/[.06]" /><div className="relative flex items-start justify-between"><div><span className={`tier-pill ${tierClass(name)}`} data-testid={`status-proposed-tier-${name.toLowerCase()}`}>{tierLabel(name)}</span><h2 className="font-editorial mt-4 text-[1.7rem] leading-tight text-emerald-950">{label}</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7ede2] text-emerald-900"><Icon size={19} /></span></div>
      <div className="relative mt-6 border-t border-stone-200 pt-4"><p className="font-mono-label text-[9px] uppercase tracking-[.16em] text-stone-500">Điều kiện đề xuất</p><div className="mt-3 space-y-2">{criteria.map((item,i)=><div className="flex items-center gap-2 text-sm text-emerald-950" key={item}><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e3ebdf] text-emerald-900"><Check size={12} /></span><span>{item}</span></div>)}</div></div>
      <div className="relative mt-5 border-t border-stone-200 pt-4"><p className="font-mono-label text-[9px] uppercase tracking-[.16em] text-stone-500">Quyền lợi gợi ý</p><div className="mt-3 space-y-2">{perks.map(perk=><div key={perk} className="flex items-center gap-2 text-sm text-stone-700"><span className="h-1.5 w-1.5 rounded-full bg-[#c7834b]" />{perk}</div>)}</div><span className="mt-4 inline-flex rounded-full bg-[#f4e8d7] px-2.5 py-1 text-[9px] font-semibold text-[#8d6037]">Chỉ là đề xuất</span></div>
    </article>)}</div>
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-stone-300/70 bg-white/45 px-5 py-4"><CircleHelp size={17} className="mt-0.5 shrink-0 text-stone-500" /><p className="text-xs leading-5 text-stone-600">Nhãn hạng trên hồ sơ chỉ xem trước các ngưỡng đề xuất. Màn hình này dùng để trao đổi, không kích hoạt chính sách hoặc cấp quyền lợi; chủ quán cần duyệt trước.</p></div>
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