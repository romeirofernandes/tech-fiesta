import React, { createContext, useContext } from 'react';
import {
    AbsoluteFill,
    Series,
    useCurrentFrame,
    useVideoConfig,
    interpolate,
    spring,
    Easing,
} from 'remotion';

// ─── Theme Colors ───

const DarkTheme = {
    // Backgrounds
    bgDeep:    '#050f0a',
    bgCard:    '#0c1a12',
    bgMuted:   '#111f17',
    bgAccent:  '#162b1e',

    // Text
    white:     '#f0fdf4',
    muted:     '#86efac',
    dim:       '#4ade80',
    faint:     '#22543d',

    // Brand
    primary:   '#22c55e',
    primaryDk: '#166534',
    gold:      '#eab308',
    red:       '#ef4444',
    blue:      '#3b82f6',
    purple:    '#a855f7',
    orange:    '#f97316',
    pink:      '#ec4899',
    teal:      '#14b8a6',

    // Chart palette
    chart1: '#22c55e',
    chart2: '#eab308',
    chart3: '#3b82f6',
    chart4: '#f97316',
    chart5: '#a855f7',
};

const LightTheme = {
    // Backgrounds
    bgDeep:    '#ffffff',
    bgCard:    '#f8fafc', // slate-50
    bgMuted:   '#f1f5f9', // slate-100
    bgAccent:  '#e2e8f0', // slate-200

    // Text
    white:     '#0f172a', // slate-900 (Primary text)
    muted:     '#64748b', // slate-500 (Secondary text)
    dim:       '#334155', // slate-700
    faint:     '#94a3b8', // slate-400

    // Brand (Adjusted for contrast on light bg)
    primary:   '#16a34a', // green-600
    primaryDk: '#15803d', // green-700
    gold:      '#ca8a04', // yellow-600
    red:       '#dc2626', // red-600
    blue:      '#2563eb', // blue-600
    purple:    '#9333ea', // purple-600
    orange:    '#ea580c', // orange-600
    pink:      '#db2777', // pink-600
    teal:      '#0d9488', // teal-600

    // Chart palette
    chart1: '#16a34a',
    chart2: '#ca8a04',
    chart3: '#2563eb',
    chart4: '#ea580c',
    chart5: '#9333ea',
};

// ─── Context ───
const ThemeContext = createContext(DarkTheme);
const useThemeColors = () => useContext(ThemeContext);

const getSpeciesColors = (T) => ({
    cow: T.chart1,
    buffalo: T.purple,
    goat: T.teal,
    sheep: T.pink,
    chicken: T.red,
    pig: T.orange,
    horse: T.blue,
    other: '#6b7280',
});

// ─── Animated Progress Bar ───
const ProgressBar = ({ label, value, max, delay = 0, color, unit = '' }) => {
    const T = useThemeColors();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const finalColor = color || T.primary;

    const progress = spring({
        frame: frame - delay,
        fps,
        config: { damping: 200 },
    });

    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const barWidth = interpolate(progress, [0, 1], [0, pct], { extrapolateRight: 'clamp' });
    const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    return (
        <div style={{ opacity, marginBottom: 16, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 16, color: T.muted, fontWeight: 500, textTransform: 'capitalize' }}>{label}</span>
                <span style={{ fontSize: 16, color: T.white, fontWeight: 600 }}>{value}{unit ? ` ${unit}` : ''}</span>
            </div>
            <div style={{ width: '100%', height: 10, background: T.videoBg ? T.bgMuted : T.faint, borderRadius: 5, overflow: 'hidden', opacity: 0.2 }}>
                 {/* Background track opacity fix */}
                 <div style={{ width: '100%', height: '100%', background: T.dim, opacity: 0.2 }} />
            </div>
            {/* Actual bar on top (fix layout) */}
            <div style={{ width: '100%', height: 10, background: T.bgAccent, borderRadius: 5, overflow: 'hidden', marginTop: -10 }}>
                <div style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${finalColor}, ${finalColor}cc)`,
                    borderRadius: 5,
                }} />
            </div>
        </div>
    );
};

// Simplified ProgressBar for cleaner code (revert to original structure but with T)
const SimpleProgressBar = ({ label, value, max, delay = 0, color, unit = '' }) => {
    const T = useThemeColors();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const finalColor = color || T.primary;

    const progress = spring({ frame: frame - delay, fps, config: { damping: 200 } });
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const barWidth = interpolate(progress, [0, 1], [0, pct], { extrapolateRight: 'clamp' });
    const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: 'clamp' });

    return (
        <div style={{ opacity, marginBottom: 16, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 16, color: T.muted, fontWeight: 500, textTransform: 'capitalize' }}>{label}</span>
                <span style={{ fontSize: 16, color: T.white, fontWeight: 600 }}>{value}{unit ? ` ${unit}` : ''}</span>
            </div>
            <div style={{ width: '100%', height: 10, background: T.bgMuted, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${finalColor}, ${finalColor}cc)`,
                    borderRadius: 5,
                }} />
            </div>
        </div>
    );
};


// ─── Animated Bar Chart ───
const BarChart = ({ data, delay = 0, height = 200, colorKey }) => {
    const T = useThemeColors();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    if (!data || data.length === 0) return null;
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const barW = Math.min(60, (800 / data.length) - 20);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            height,
            gap: 16,
            width: '100%',
        }}>
            {data.map((item, i) => {
                const barSpring = spring({
                    frame: frame - delay - i * 5,
                    fps,
                    config: { damping: 200 },
                });
                const barH = interpolate(barSpring, [0, 1], [0, (item.value / maxVal) * (height - 30)], {
                    extrapolateRight: 'clamp',
                });
                const labelOpacity = interpolate(frame, [delay + i * 5 + 10, delay + i * 5 + 20], [0, 1], {
                    extrapolateRight: 'clamp',
                });
                const color = colorKey?.[item.label] || [T.chart1, T.chart2, T.chart3, T.chart4, T.chart5][i % 5];

                return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: T.white, fontWeight: 600, marginBottom: 4, opacity: labelOpacity }}>
                            {item.value}
                        </span>
                        <div style={{
                            width: barW,
                            height: barH,
                            background: `linear-gradient(180deg, ${color}, ${color}88)`,
                            borderRadius: '6px 6px 0 0',
                        }} />
                        <span style={{
                            fontSize: 11,
                            color: T.muted,
                            marginTop: 6,
                            textTransform: 'capitalize',
                            maxWidth: barW + 10,
                            textAlign: 'center',
                            opacity: labelOpacity,
                        }}>
                            {item.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Stat Card ───
const StatCard = ({ label, value, delay = 0, color, width = 180 }) => {
    const T = useThemeColors();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const finalColor = color || T.primary;

    const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
    const scale = interpolate(s, [0, 1], [0.7, 1]);
    const opacity = interpolate(s, [0, 1], [0, 1]);

    return (
        <div style={{
            transform: `scale(${scale})`,
            opacity,
            background: T.bgCard,
            border: `1px solid ${finalColor}33`,
            padding: '20px 16px',
            borderRadius: 12,
            minWidth: width,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: 8,
            boxShadow: `0 4px 6px -1px ${T.bgDeep}10`,
        }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: T.white, lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: 14, color: T.muted, marginTop: 6, textTransform: 'capitalize', fontWeight: 500 }}>{label}</span>
        </div>
    );
};

// ─── Section Header ───
const SectionHeader = ({ text }) => {
    const T = useThemeColors();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const o = interpolate(frame, [0, 0.4 * fps], [0, 1], { extrapolateRight: 'clamp' });
    const y = interpolate(frame, [0, 0.4 * fps], [20, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });

    return (
        <div style={{
            opacity: o,
            transform: `translateY(${y}px)`,
            fontSize: 44,
            fontWeight: 700,
            color: T.white,
            marginBottom: 30,
            fontFamily: "'Instrument Serif', serif",
            letterSpacing: '0.02em',
        }}>
            {text}
        </div>
    );
};

// ─── Scene base wrapper ───
const SceneBg = ({ children, gradient }) => {
    const T = useThemeColors();
    // Use dynamic gradient based on theme if not provided?
    // Or interpolate between theme colors?
    const defaultGradient = `linear-gradient(160deg, ${T.bgDeep} 0%, ${T.bgMuted} 100%)`;

    return (
        <AbsoluteFill style={{
            background: gradient || defaultGradient,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 60,
        }}>
            {children}
        </AbsoluteFill>
    );
};

// ─── 1. INTRO ───
const IntroScene = ({ farmerName, farmCount, summaryDate }) => {
    const T = useThemeColors();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const titleO = interpolate(frame, [0, 1 * fps], [0, 1], { extrapolateRight: 'clamp' });
    const titleY = interpolate(frame, [0, 1 * fps], [50, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
    const subO = interpolate(frame, [0.6 * fps, 1.4 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const lineW = interpolate(frame, [0.8 * fps, 1.8 * fps], [0, 120], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const metaO = interpolate(frame, [1.2 * fps, 2 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    const dateStr = summaryDate
        ? new Date(summaryDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';

    return (
        <SceneBg gradient={`linear-gradient(160deg, ${T.bgDeep} 0%, ${T.bgAccent} 50%, ${T.bgMuted} 100%)`}>
            {/* Decorative rings */}
            <div style={{
                position: 'absolute', width: 400, height: 400, borderRadius: '50%',
                border: `1px solid ${T.primary}15`,
                opacity: interpolate(frame, [0, 2 * fps], [0, 0.6], { extrapolateRight: 'clamp' }),
            }} />
            <div style={{
                position: 'absolute', width: 600, height: 600, borderRadius: '50%',
                border: `1px solid ${T.primary}08`,
                opacity: interpolate(frame, [0.5 * fps, 2.5 * fps], [0, 0.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }} />

            <div style={{ opacity: titleO, transform: `translateY(${titleY}px)`, textAlign: 'center' }}>
                <div style={{ fontSize: 68, fontWeight: 800, color: T.white, fontFamily: "'Instrument Serif', serif", letterSpacing: '0.02em' }}>
                    {farmerName || 'Farmer'}
                </div>
            </div>

            {/* Accent line */}
            <div style={{ width: lineW, height: 3, background: `linear-gradient(90deg, transparent, ${T.primary}, transparent)`, borderRadius: 2, marginTop: 16, marginBottom: 16 }} />

            <div style={{ opacity: subO, fontSize: 28, color: T.dim, fontWeight: 500, textAlign: 'center' }}>
                Monthly Farm Summary
            </div>
            <div style={{ opacity: metaO, fontSize: 18, color: T.faint, marginTop: 10 }}>
                {dateStr} &middot; {farmCount} Farm{farmCount !== 1 ? 's' : ''}
            </div>
        </SceneBg>
    );
};

// ─── 2. LIVESTOCK OVERVIEW ───
const LivestockScene = ({ stats }) => {
    const T = useThemeColors();
    const SPECIES_COLOR = getSpeciesColors(T);
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const speciesEntries = Object.entries(stats.speciesBreakdown || {});
    const maxSpecies = Math.max(...speciesEntries.map(([, v]) => v), 1);

    const barData = speciesEntries.map(([species, count]) => ({
        label: species,
        value: count,
    }));

    return (
        <SceneBg>
            <SectionHeader text="Livestock Overview" />

            <div style={{ display: 'flex', gap: 20, marginBottom: 30 }}>
                <StatCard label="Total Animals" value={stats.totalAnimals || 0} delay={0.3 * fps} color={T.primary} />
                <StatCard label="Male" value={stats.genderBreakdown?.male || 0} delay={0.5 * fps} color={T.blue} />
                <StatCard label="Female" value={stats.genderBreakdown?.female || 0} delay={0.7 * fps} color={T.pink} />
            </div>

            {/* Species bar chart */}
            {barData.length > 0 && (
                <div style={{ width: 700 }}>
                    <div style={{ fontSize: 16, color: T.muted, fontWeight: 500, marginBottom: 16 }}>
                        Species Distribution
                    </div>
                    <BarChart data={barData} delay={1 * fps} height={160} colorKey={SPECIES_COLOR} />
                </div>
            )}

            {/* Progress bars per species */}
            <div style={{ width: 600, marginTop: 20 }}>
                {speciesEntries.map(([species, count], idx) => (
                    <SimpleProgressBar
                        key={species}
                        label={species}
                        value={count}
                        max={stats.totalAnimals || 1}
                        delay={1.5 * fps + idx * 8}
                        color={SPECIES_COLOR[species] || T.chart3}
                    />
                ))}
            </div>
        </SceneBg>
    );
};

// ─── 3. PRODUCTION ───
const ProductionScene = ({ production }) => {
    const T = useThemeColors();
    const { fps } = useVideoConfig();

    const barData = (production || []).map(p => ({
        label: p._id,
        value: p.totalQuantity,
    }));

    const maxProd = Math.max(...(production || []).map(p => p.totalQuantity), 1);

    return (
        <SceneBg gradient={`linear-gradient(160deg, ${T.bgDeep} 0%, ${T.bgMuted} 100%)`}>
            <SectionHeader text="Production — Last 30 Days" />

            {barData.length > 0 ? (
                <>
                    <div style={{ width: 700, marginBottom: 30 }}>
                        <BarChart data={barData} delay={0.5 * fps} height={180} />
                    </div>
                    <div style={{ width: 600 }}>
                        {(production || []).map((item, idx) => (
                            <SimpleProgressBar
                                key={idx}
                                label={`${item._id} (${item.unit || ''})`}
                                value={item.totalQuantity}
                                max={maxProd}
                                delay={1.5 * fps + idx * 8}
                                color={[T.chart1, T.chart2, T.chart3, T.chart4, T.chart5][idx % 5]}
                                unit={item.unit || ''}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <div style={{
                    opacity: 1, fontSize: 24, color: T.faint, marginTop: 20,
                }}>
                    No production records this month
                </div>
            )}
        </SceneBg>
    );
};

// ─── 4. FINANCE ───
const FinanceScene = ({ sales, expenses }) => {
    const T = useThemeColors();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const revenue = sales?.totalRevenue || 0;
    const expenseTotal = expenses?.totalExpenses || 0;
    const profit = revenue - expenseTotal;
    const maxFin = Math.max(revenue, expenseTotal, 1);

    return (
        <SceneBg>
            <SectionHeader text="Financial Summary" />

            <div style={{ display: 'flex', gap: 24, marginBottom: 30 }}>
                <StatCard label="Revenue" value={`₹${revenue.toLocaleString('en-IN')}`} delay={0.3 * fps} color={T.primary} width={220} />
                <StatCard label="Expenses" value={`₹${expenseTotal.toLocaleString('en-IN')}`} delay={0.5 * fps} color={T.red} width={220} />
                <StatCard
                    label={profit >= 0 ? 'Net Profit' : 'Net Loss'}
                    value={`₹${Math.abs(profit).toLocaleString('en-IN')}`}
                    delay={0.8 * fps}
                    color={profit >= 0 ? T.gold : T.red}
                    width={220}
                />
            </div>

            <div style={{ width: 600 }}>
                <SimpleProgressBar label="Revenue" value={revenue} max={maxFin} delay={1.2 * fps} color={T.primary} unit="INR" />
                <SimpleProgressBar label="Expenses" value={expenseTotal} max={maxFin} delay={1.5 * fps} color={T.red} unit="INR" />
                <SimpleProgressBar
                    label={profit >= 0 ? 'Profit' : 'Loss'}
                    value={Math.abs(profit)}
                    max={maxFin}
                    delay={1.8 * fps}
                    color={profit >= 0 ? T.gold : T.red}
                    unit="INR"
                />
            </div>
        </SceneBg>
    );
};

// ─── 5. HEALTH & VACCINATIONS ───
const HealthVaccScene = ({ vaccinationsLast30Days, healthAlerts, totalAnimals }) => {
    const T = useThemeColors();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const healthy = Math.max((totalAnimals || 0) - (healthAlerts || 0), 0);
    const healthPct = totalAnimals > 0 ? Math.round((healthy / totalAnimals) * 100) : 100;

    return (
        <SceneBg gradient={`linear-gradient(160deg, ${T.bgDeep} 0%, ${T.bgAccent} 100%)`}>
            <SectionHeader text="Health & Vaccinations" />

            <div style={{ display: 'flex', gap: 24, marginBottom: 30 }}>
                <StatCard label="Vaccinations Done" value={vaccinationsLast30Days || 0} delay={0.3 * fps} color={T.blue} width={220} />
                <StatCard label="Health Alerts" value={healthAlerts || 0} delay={0.5 * fps} color={healthAlerts > 0 ? T.red : T.primary} width={220} />
                <StatCard label="Healthy Animals" value={healthy} delay={0.7 * fps} color={T.primary} width={220} />
            </div>

            <div style={{ width: 600 }}>
                <SimpleProgressBar label="Herd Health Score" value={healthPct} max={100} delay={1 * fps} color={healthPct > 70 ? T.primary : healthPct > 40 ? T.gold : T.red} unit="%" />
                <SimpleProgressBar label="Vaccination Coverage" value={vaccinationsLast30Days || 0} max={Math.max(totalAnimals || 1, vaccinationsLast30Days || 1)} delay={1.3 * fps} color={T.blue} />
                <SimpleProgressBar label="Alerts Raised" value={healthAlerts || 0} max={Math.max(totalAnimals || 1, healthAlerts || 1)} delay={1.6 * fps} color={T.red} />
            </div>
        </SceneBg>
    );
};

// ─── 6. OUTRO ───
const OutroScene = ({ farmerName }) => {
    const T = useThemeColors();
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const s = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
    const titleO = interpolate(frame, [0, 0.5 * fps], [0, 1], { extrapolateRight: 'clamp' });
    const subtitleO = interpolate(frame, [0.5 * fps, 1.2 * fps], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const lineW = interpolate(frame, [0.3 * fps, 1.2 * fps], [0, 80], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

    return (
        <SceneBg gradient={`linear-gradient(160deg, ${T.bgDeep} 0%, ${T.bgAccent} 50%, ${T.bgMuted} 100%)`}>
            <div style={{
                opacity: titleO,
                transform: `scale(${s})`,
                fontSize: 56,
                fontWeight: 800,
                color: T.white,
                textAlign: 'center',
                fontFamily: "'Instrument Serif', serif",
                letterSpacing: '0.02em',
            }}>
                Keep it up, {farmerName || 'Farmer'}!
            </div>
            <div style={{ width: lineW, height: 3, background: `linear-gradient(90deg, transparent, ${T.primary}, transparent)`, borderRadius: 2, marginTop: 20, marginBottom: 20 }} />
            <div style={{ opacity: subtitleO, fontSize: 20, color: T.dim }}>
                Powered by Pashu Pehchan
            </div>
        </SceneBg>
    );
};

// ─── Main Composition ───
export const FarmerSummaryVideo = ({ data, theme }) => {
    if (!data) return null;

    const { fps } = useVideoConfig();
    const activeTheme = theme === 'light' ? LightTheme : DarkTheme;

    return (
        <ThemeContext.Provider value={activeTheme}>
            <AbsoluteFill style={{ background: activeTheme.bgDeep }}>
                <Series>
                    <Series.Sequence durationInFrames={Math.round(3 * fps)}>
                        <IntroScene farmerName={data.farmerName} farmCount={data.farmCount} summaryDate={data.summaryDate} />
                    </Series.Sequence>
                    <Series.Sequence durationInFrames={Math.round(4 * fps)}>
                        <LivestockScene stats={data.stats} />
                    </Series.Sequence>
                    <Series.Sequence durationInFrames={Math.round(3.5 * fps)}>
                        <ProductionScene production={data.stats.productionLast30Days} />
                    </Series.Sequence>
                    <Series.Sequence durationInFrames={Math.round(3.5 * fps)}>
                        <FinanceScene sales={data.stats.salesLast30Days} expenses={data.stats.expensesLast30Days} />
                    </Series.Sequence>
                    <Series.Sequence durationInFrames={Math.round(3 * fps)}>
                        <HealthVaccScene
                            vaccinationsLast30Days={data.stats.vaccinationsLast30Days}
                            healthAlerts={data.stats.healthAlerts}
                            totalAnimals={data.stats.totalAnimals}
                        />
                    </Series.Sequence>
                    <Series.Sequence durationInFrames={Math.round(3 * fps)}>
                        <OutroScene farmerName={data.farmerName} />
                    </Series.Sequence>
                </Series>
            </AbsoluteFill>
        </ThemeContext.Provider>
    );
};
