"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import {
  Activity,
  Thermometer,
  Zap,
  Brain,
  Radio,
  Bluetooth,
  Wifi,
  Shield,
  ChevronDown,
  X,
  AlertTriangle,
  Droplets,
} from "lucide-react";

/* ───────────── Types ───────────── */

interface DataPoint {
  time: number;
  hr?: number;
  skinTemp?: number;
  ambientTemp?: number;
  eda?: number;
}

type SystemStatus = "Normal" | "Caution" | "Critical";
type ConnectionType = "Bluetooth" | "Local Mesh Network";
type OccupationalProfile =
  | "Agriculture"
  | "Construction"
  | "Delivery"
  | "Factory";

interface ScenarioTargets {
  hr: number;
  skinTemp: number;
  ambientTemp: number;
  eda: number;
  zScore: number;
  status: SystemStatus;
  connection: ConnectionType;
}

/* ───────────── Scenario Presets ───────────── */

const SCENARIOS: Record<string, ScenarioTargets> = {
  "1": {
    hr: 85,
    skinTemp: 34.5,
    ambientTemp: 42,
    eda: 2.5,
    zScore: 0.8,
    status: "Normal",
    connection: "Bluetooth",
  },
  "2": {
    hr: 125,
    skinTemp: 37.5,
    ambientTemp: 44,
    eda: 6.2,
    zScore: 2.7,
    status: "Caution",
    connection: "Bluetooth",
  },
  "3": {
    hr: 155,
    skinTemp: 39,
    ambientTemp: 46,
    eda: 9.8,
    zScore: 3.8,
    status: "Critical",
    connection: "Local Mesh Network",
  },
  "4": {
    hr: 85,
    skinTemp: 34.5,
    ambientTemp: 42,
    eda: 2.5,
    zScore: 0.8,
    status: "Normal",
    connection: "Bluetooth",
  },
};

const MAX_POINTS = 30;

function jitter(value: number, pct = 0.02): number {
  return value + value * (Math.random() * 2 - 1) * pct;
}

function lerp(current: number, target: number, factor = 0.08): number {
  return current + (target - current) * factor;
}

/* ───────────── Main Component ───────────── */

export default function Dashboard() {
  /* state */
  const [targets, setTargets] = useState<ScenarioTargets>(SCENARIOS["1"]);
  const currentValues = useRef({
    hr: 85,
    skinTemp: 34.5,
    ambientTemp: 42,
    eda: 2.5,
    zScore: 0.8,
  });

  const [hrData, setHrData] = useState<DataPoint[]>([]);
  const [tempData, setTempData] = useState<DataPoint[]>([]);
  const [edaData, setEdaData] = useState<DataPoint[]>([]);

  const [displayHr, setDisplayHr] = useState(85);
  const [displaySkinTemp, setDisplaySkinTemp] = useState(34.5);
  const [displayAmbientTemp, setDisplayAmbientTemp] = useState(42);
  const [displayEda, setDisplayEda] = useState(2.5);
  const [displayZScore, setDisplayZScore] = useState(0.8);
  const [status, setStatus] = useState<SystemStatus>("Normal");
  const [connection, setConnection] = useState<ConnectionType>("Bluetooth");
  const [profile, setProfile] = useState<OccupationalProfile>("Agriculture");

  const [showCriticalModal, setShowCriticalModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastExiting, setToastExiting] = useState(false);

  const tickRef = useRef(0);

  /* keyboard listener */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key;
      if (!["1", "2", "3", "4"].includes(key)) return;

      if (key === "4") {
        setShowToast(true);
        setToastExiting(false);
        setTimeout(() => {
          setToastExiting(true);
          setTimeout(() => setShowToast(false), 250);
        }, 4000);
        return;
      }

      const scenario = SCENARIOS[key];
      setTargets(scenario);
      setStatus(scenario.status);
      setConnection(scenario.connection);

      if (key === "3") {
        setTimeout(() => setShowCriticalModal(true), 600);
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /* simulation tick — every 1s */
  useEffect(() => {
    const interval = setInterval(() => {
      const cv = currentValues.current;
      cv.hr = lerp(cv.hr, targets.hr);
      cv.skinTemp = lerp(cv.skinTemp, targets.skinTemp);
      cv.ambientTemp = lerp(cv.ambientTemp, targets.ambientTemp);
      cv.eda = lerp(cv.eda, targets.eda);
      cv.zScore = lerp(cv.zScore, targets.zScore);

      const hr = jitter(cv.hr);
      const skinTemp = jitter(cv.skinTemp, 0.005);
      const ambientTemp = jitter(cv.ambientTemp, 0.003);
      const eda = jitter(cv.eda, 0.03);

      const t = tickRef.current++;

      setHrData((prev) => [...prev.slice(-(MAX_POINTS - 1)), { time: t, hr }]);
      setTempData((prev) => [
        ...prev.slice(-(MAX_POINTS - 1)),
        { time: t, skinTemp, ambientTemp },
      ]);
      setEdaData((prev) => [
        ...prev.slice(-(MAX_POINTS - 1)),
        { time: t, eda },
      ]);

      setDisplayHr(Math.round(hr));
      setDisplaySkinTemp(parseFloat(skinTemp.toFixed(1)));
      setDisplayAmbientTemp(parseFloat(ambientTemp.toFixed(1)));
      setDisplayEda(parseFloat(eda.toFixed(2)));
      setDisplayZScore(parseFloat(cv.zScore.toFixed(1)));
    }, 1000);

    return () => clearInterval(interval);
  }, [targets]);

  /* status helpers */
  const statusColor =
    status === "Critical"
      ? "text-red"
      : status === "Caution"
      ? "text-yellow"
      : "text-green";

  const statusBg =
    status === "Critical"
      ? "bg-red-dim"
      : status === "Caution"
      ? "bg-yellow-dim"
      : "bg-green-dim";

  const statusBorder =
    status === "Critical"
      ? "border-red/30"
      : status === "Caution"
      ? "border-yellow/30"
      : "border-green/30";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
            <Shield className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-text-primary">
              HeatStroke Sentinel
            </h1>
            <p className="text-xs text-text-muted">
              Digital Twin — Live Monitor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-text-muted font-mono">
            SN-0042 &middot; FW v2.3.1
          </span>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBg} ${statusColor} border ${statusBorder}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === "Critical"
                  ? "bg-red animate-pulse"
                  : status === "Caution"
                  ? "bg-yellow"
                  : "bg-green"
              }`}
            />
            {status}
          </div>
        </div>
      </header>

      {/* ─── Main Grid ─── */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ─── Left: Charts ─── */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          <ChartCard
            title="Heart Rate (PPG)"
            icon={<Activity className="w-4 h-4 text-chart-hr" />}
            value={`${displayHr}`}
            unit="BPM"
            accentColor="text-chart-hr"
          >
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={hrData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={false} axisLine={false} />
                <YAxis domain={[60, 180]} tickCount={5} width={32} />
                <Tooltip
                  contentStyle={{
                    background: "#1a2332",
                    border: "1px solid #1f2937",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={() => ""}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((v: ValueType | undefined) => [`${Math.round((v ?? 0) as number)} BPM`, "HR"]) as any}
                />
                <Line
                  type="monotone"
                  dataKey="hr"
                  stroke="#f472b6"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Temperature"
            icon={<Thermometer className="w-4 h-4 text-chart-skin" />}
            value={`${displaySkinTemp}°`}
            unit="°C Skin"
            accentColor="text-chart-skin"
            secondaryValue={`${displayAmbientTemp}°C Ambient`}
          >
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={tempData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={false} axisLine={false} />
                <YAxis domain={[30, 50]} tickCount={5} width={32} />
                <Tooltip
                  contentStyle={{
                    background: "#1a2332",
                    border: "1px solid #1f2937",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={() => ""}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((v: ValueType | undefined, name: NameType) => [
                    `${((v ?? 0) as number).toFixed(1)}°C`,
                    name === "skinTemp" ? "Skin" : "Ambient",
                  ]) as any}
                />
                <Line
                  type="monotone"
                  dataKey="skinTemp"
                  stroke="#fb923c"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="ambientTemp"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Electrodermal Activity"
            icon={<Zap className="w-4 h-4 text-chart-eda" />}
            value={`${displayEda}`}
            unit="µS"
            accentColor="text-chart-eda"
          >
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={edaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={false} axisLine={false} />
                <YAxis domain={[0, 14]} tickCount={5} width={32} />
                <Tooltip
                  contentStyle={{
                    background: "#1a2332",
                    border: "1px solid #1f2937",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={() => ""}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((v: ValueType | undefined) => [
                    `${((v ?? 0) as number).toFixed(2)} µS`,
                    "EDA",
                  ]) as any}
                />
                <Line
                  type="monotone"
                  dataKey="eda"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        {/* ─── Right: Sidebar ─── */}
        <aside className="lg:col-span-4 flex flex-col gap-4">
          {/* Edge ML Status */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-5">
              <Brain className="w-4 h-4 text-accent" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Edge ML Inference
              </h2>
            </div>

            {/* Z-Score */}
            <div className="text-center py-4">
              <p className="text-xs text-text-muted mb-1">
                Welford Algorithm Z-Score
              </p>
              <p
                className={`text-4xl font-mono font-bold tracking-tight ${statusColor}`}
              >
                +{displayZScore}&thinsp;σ
              </p>
            </div>

            {/* Status badge */}
            <div
              className={`mt-4 rounded-lg border ${statusBorder} ${statusBg} px-4 py-3 flex items-center justify-between`}
            >
              <span className="text-xs text-text-secondary">
                System Status
              </span>
              <span className={`text-sm font-semibold ${statusColor}`}>
                {status}
              </span>
            </div>

            {/* Thresholds reference */}
            <div className="mt-4 space-y-2 text-xs text-text-muted">
              <div className="flex justify-between">
                <span>Normal threshold</span>
                <span className="text-green font-mono">&lt; 2.0 σ</span>
              </div>
              <div className="flex justify-between">
                <span>Caution threshold</span>
                <span className="text-yellow font-mono">2.0 – 3.0 σ</span>
              </div>
              <div className="flex justify-between">
                <span>Critical threshold</span>
                <span className="text-red font-mono">&gt; 3.0 σ</span>
              </div>
            </div>
          </div>

          {/* Environment & Connectivity */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-5">
              <Radio className="w-4 h-4 text-accent" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Environment &amp; Connectivity
              </h2>
            </div>

            {/* Profile dropdown */}
            <label className="block mb-4">
              <span className="block text-xs text-text-muted mb-1.5">
                Occupational Profile
              </span>
              <div className="relative">
                <select
                  id="occupational-profile"
                  value={profile}
                  onChange={(e) =>
                    setProfile(e.target.value as OccupationalProfile)
                  }
                  className="w-full appearance-none bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-text-primary pr-8 focus:outline-none focus:border-accent/50"
                >
                  <option value="Agriculture">🌾 Agriculture</option>
                  <option value="Construction">🏗️ Construction</option>
                  <option value="Delivery">🚚 Delivery</option>
                  <option value="Factory">🏭 Factory</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              </div>
            </label>

            {/* Connection */}
            <div className="flex items-center justify-between rounded-lg bg-surface-raised border border-border px-4 py-3">
              <span className="text-xs text-text-muted">Connection</span>
              <span className="flex items-center gap-1.5 text-sm text-text-primary font-medium">
                {connection === "Bluetooth" ? (
                  <Bluetooth className="w-3.5 h-3.5 text-accent" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-yellow" />
                )}
                {connection}
              </span>
            </div>

            {/* Extra stats */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat label="Battery" value="78%" />
              <MiniStat label="Signal" value="-42 dBm" />
              <MiniStat label="Uptime" value="4h 12m" />
              <MiniStat label="Samples" value={`${tickRef.current}`} live />
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="bg-surface rounded-xl border border-border-subtle p-4 text-xs text-text-muted leading-relaxed">
            <p className="font-medium text-text-secondary mb-2">
              Demo Controls
            </p>
            <div className="space-y-1 font-mono">
              <p>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-raised border border-border text-text-secondary">
                  1
                </kbd>{" "}
                Normal
              </p>
              <p>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-raised border border-border text-text-secondary">
                  2
                </kbd>{" "}
                Heat Strain
              </p>
              <p>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-raised border border-border text-text-secondary">
                  3
                </kbd>{" "}
                Critical Alert
              </p>
              <p>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-raised border border-border text-text-secondary">
                  4
                </kbd>{" "}
                NFC Patch Sync
              </p>
            </div>
          </div>
        </aside>
      </main>

      {/* ─── Critical Modal ─── */}
      {showCriticalModal && (
        <div className="modal-overlay" onClick={() => setShowCriticalModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-dim flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-red">
                  Critical Heat Strain Detected
                </h3>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                  Mesh broadcast sent to nearby workers. Immediate intervention
                  recommended. Core temperature exceeds safe operating limits.
                </p>
              </div>
            </div>
            <button
              id="dismiss-critical-modal"
              onClick={() => setShowCriticalModal(false)}
              className="w-full mt-2 px-4 py-2 bg-red/15 hover:bg-red/25 text-red text-sm font-medium rounded-lg border border-red/20 transition-colors cursor-pointer"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* ─── Toast ─── */}
      {showToast && (
        <div className={`toast ${toastExiting ? "toast-exit" : ""}`}>
          <div className="flex items-center gap-3">
            <Droplets className="w-5 h-5 text-accent flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                NFC Patch Scanned
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Hydration at 82% — Baseline Adjusted.
              </p>
            </div>
            <button
              id="dismiss-toast"
              onClick={() => {
                setToastExiting(true);
                setTimeout(() => setShowToast(false), 200);
              }}
              className="ml-2 text-text-muted hover:text-text-secondary cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Subcomponents ───────────── */

function ChartCard({
  title,
  icon,
  value,
  unit,
  accentColor,
  secondaryValue,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  unit: string;
  accentColor: string;
  secondaryValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {title}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-mono font-bold ${accentColor}`}>
            {value}
          </span>
          <span className="text-xs text-text-muted">{unit}</span>
          {secondaryValue && (
            <>
              <span className="text-text-muted mx-1">·</span>
              <span className="text-xs text-text-muted">{secondaryValue}</span>
            </>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function MiniStat({
  label,
  value,
  live,
}: {
  label: string;
  value: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-lg bg-surface-raised border border-border-subtle px-3 py-2">
      <p className="text-[10px] text-text-muted uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-mono font-medium text-text-primary mt-0.5">
        {value}
        {live && (
          <span className="inline-block w-1 h-1 rounded-full bg-green ml-1 animate-pulse" />
        )}
      </p>
    </div>
  );
}
