import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CarFront,
  CircleDollarSign,
  Clock3,
  Layers3,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  try {
    const [zones, total, occupied, available, activeBookings, paid] = await Promise.all([
      prisma.zone.count(),
      prisma.slot.count({ where: { isShadowPool: false, status: { not: "MAINTENANCE" } } }),
      prisma.slot.count({ where: { isShadowPool: false, status: "OCCUPIED" } }),
      prisma.slot.count({ where: { isShadowPool: false, status: "AVAILABLE" } }),
      prisma.booking.count({ where: { status: "ACTIVE" } }),
      prisma.booking.aggregate({ where: { paymentStatus: "PAID" }, _sum: { totalPaidPaise: true } }),
    ]);
    return { connected: true, zones, total, occupied, available, activeBookings, revenue: paid._sum.totalPaidPaise ?? 0 };
  } catch {
    return { connected: false, zones: 0, total: 0, occupied: 0, available: 0, activeBookings: 0, revenue: 0 };
  }
}

const endpoints = [
  { method: "POST", route: "/api/parking/entry", description: "Allocate a slot at the gate" },
  { method: "POST", route: "/api/parking/exit", description: "Close a session and calculate charges" },
  { method: "POST", route: "/api/parking/reserve", description: "Reserve with the 30 minute buffer" },
  { method: "POST", route: "/api/operator/override", description: "Change an on-site slot status" },
  { method: "GET", route: "/api/finance/revenue", description: "View occupancy and settled revenue" },
];

function StatCard({ label, value, detail, icon: Icon, tone = "mint" }: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tone?: "mint" | "blue" | "amber" | "lavender";
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}><Icon size={18} strokeWidth={1.8} /></div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail"><span className="dot" />{detail}</div>
    </article>
  );
}

export default async function Home() {
  const data = await getDashboardData();
  const occupancy = data.total ? Math.round(data.occupied / data.total * 100) : 0;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark"><CarFront size={20} /></span>
          <span><strong>Parkwise</strong><small>SMART PARKING</small></span>
        </Link>
        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-link selected" href="#overview"><Activity size={17} />Overview<span className="nav-active" /></a>
          <Link className="nav-link" href="/api/slots"><Layers3 size={17} />Parking layout</Link>
          <a className="nav-link" href="/api/bookings"><CarFront size={17} />Bookings</a>
          <a className="nav-link" href="/api/finance/revenue"><CircleDollarSign size={17} />Revenue</a>
        </nav>
        <div className="nav-label operations-label">OPERATIONS</div>
        <nav className="side-nav" aria-label="Operations navigation">
          <a className="nav-link" href="/api/health"><Activity size={17} />System health</a>
          <a className="nav-link" href="/api/zones"><Layers3 size={17} />Zones & levels</a>
        </nav>
        <div className="sidebar-bottom">
          <div className={`connection-card ${data.connected ? "" : "offline"}`}>
            <span className="connection-dot" />
            <span><strong>{data.connected ? "System connected" : "Database offline"}</strong><small>{data.connected ? "Database responding" : "Run the initial migration"}</small></span>
          </div>
          <div className="sidebar-user"><span className="avatar">PM</span><span><strong>Parking Manager</strong><small>Local workspace</small></span><span className="more">•••</span></div>
        </div>
      </aside>

      <section className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-right"><span className="environment-pill"><i /> DEVELOPMENT</span><span className="today">Smart lot control</span></div>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow"><Sparkles size={13} /> PARKING OPERATIONS</div>
              <h1>Good morning, Manager <span>✳</span></h1>
              <p>Here&apos;s the live picture across your parking facility.</p>
            </div>
            <div className="date-chip"><Clock3 size={15} /> Live system overview</div>
          </div>

          {!data.connected && <div className="notice"><strong>Database is not connected yet.</strong> Start with <code>npm run db:migrate</code> and <code>npm run db:seed</code> to load the parking layout.</div>}

          <div className="stats-grid">
            <StatCard label="TOTAL CAPACITY" value={data.total.toLocaleString()} detail={`${data.zones} operating levels`} icon={Layers3} tone="mint" />
            <StatCard label="OCCUPIED NOW" value={data.occupied.toLocaleString()} detail={`${occupancy}% of standard capacity`} icon={CarFront} tone="blue" />
            <StatCard label="AVAILABLE SLOTS" value={data.available.toLocaleString()} detail="Excludes reserved shadow pool" icon={ArrowDownRight} tone="amber" />
            <StatCard label="ACTIVE SESSIONS" value={data.activeBookings.toLocaleString()} detail="Vehicles currently parked" icon={Activity} tone="lavender" />
          </div>

          <div className="dashboard-grid">
            <section className="panel occupancy-panel">
              <div className="panel-heading"><div><div className="section-kicker">FACILITY STATUS</div><h2>Capacity at a glance</h2></div><span className="live-pill"><i /> LIVE</span></div>
              <div className="occupancy-content">
                <div className="occupancy-ring" style={{ "--occupancy": `${occupancy}%` } as CSSProperties & { "--occupancy": string }}>
                  <div><strong>{occupancy}<small>%</small></strong><span>OCCUPIED</span></div>
                </div>
                <div className="occupancy-legend">
                  <div><span className="legend-key occupied-key" /><span>Occupied</span><strong>{data.occupied}</strong></div>
                  <div><span className="legend-key available-key" /><span>Available</span><strong>{data.available}</strong></div>
                  <div><span className="legend-key shadow-key" /><span>Shadow pool</span><strong>3</strong></div>
                </div>
              </div>
              <div className="panel-footnote"><ShieldCheck size={15} />Emergency capacity is reserved for overstay reassignment.</div>
            </section>

            <section className="panel revenue-panel">
              <div className="panel-heading"><div><div className="section-kicker">FINANCE</div><h2>Settled revenue</h2></div><span className="trend-icon"><ArrowUpRight size={17} /></span></div>
              <div className="revenue-amount"><span>₹</span>{(data.revenue / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
              <p className="muted-copy">Captured wallet payments to date</p>
              <div className="revenue-chart" aria-label="Revenue activity illustration">
                {[30, 42, 35, 57, 48, 70, 62, 78, 58, 86, 72, 100, 83, 92, 67, 82, 71, 95].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
              </div>
              <div className="chart-caption"><span>RECENT ACTIVITY</span><span>Payments are recorded at exit</span></div>
            </section>
          </div>

          <section className="panel api-panel">
            <div className="panel-heading api-heading"><div><div className="section-kicker">API QUICK REFERENCE</div><h2>Parking operations</h2></div><a className="docs-link" href="/api-reference.md">View API guide <ArrowUpRight size={14} /></a></div>
            <div className="api-table">
              {endpoints.map((endpoint) => <a className="api-row" key={endpoint.route} href={endpoint.route}>
                <span className={`method ${endpoint.method.toLowerCase()}`}>{endpoint.method}</span>
                <code>{endpoint.route}</code>
                <span className="api-description">{endpoint.description}</span>
                <ArrowUpRight className="row-arrow" size={15} />
              </a>)}
            </div>
          </section>

          <footer className="page-footer"><span><Zap size={13} /> Parkwise facility control</span><span>SQLite · Prisma · Next.js</span></footer>
        </div>
      </section>
    </main>
  );
}
