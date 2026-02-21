import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

/**
 * Radar Display Component - Military-style circular radar visualization
 * Shows 180° sweep with detected objects
 */
export function RadarDisplay({ sweepData = [], className = '' }) {
  const [sweepAngle, setSweepAngle] = useState(15);
  const [animationEnabled, setAnimationEnabled] = useState(true);

  // SVG dimensions
  const width = 500;
  const height = 300;
  const centerX = width / 2;
  const centerY = height - 20;
  const maxRadius = 250;

  // Distance rings configuration (in cm)
  const distanceRings = [20, 40, 60, 80];
  const maxDistance = 100; // cm

  // Animate sweep line
  useEffect(() => {
    if (!animationEnabled || sweepData.length === 0) return;

    const interval = setInterval(() => {
      setSweepAngle(prev => {
        const next = prev + 2;
        return next > 165 ? 15 : next;
      });
    }, 30); // Smooth animation

    return () => clearInterval(interval);
  }, [animationEnabled, sweepData.length]);

  // Convert polar coordinates (angle, distance) to cartesian (x, y)
  const polarToCartesian = (angle, distance) => {
    // Adjust angle: 0° is right, 90° is up, 180° is left (for semicircle)
    const radians = ((180 - angle) * Math.PI) / 180;
    const radius = (distance / maxDistance) * maxRadius;
    
    return {
      x: centerX + radius * Math.cos(radians),
      y: centerY - radius * Math.sin(radians)
    };
  };

  // Generate arc path for distance rings
  const generateArcPath = (radius) => {
    // Draw TOP semicircle from left -> right.
    // From 9 o'clock to 3 o'clock, sweepFlag=0 yields the upper arc.
    const startX = centerX - radius;
    const startY = centerY;
    const endX = centerX + radius;
    const endY = centerY;

    return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;
  };

  // Generate sweep line path
  const sweepLineEnd = polarToCartesian(sweepAngle, 100);

  // Theme colors (OKLCH tokens from src/index.css)
  // Use the variables directly (they already contain `oklch(...)`).
  const colors = {
    background: 'var(--card)',
    border: 'var(--border)',
    muted: 'var(--muted)',
    mutedForeground: 'var(--muted-foreground)',
    primary: 'var(--primary)',
    destructive: 'var(--destructive)',
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono text-foreground">
            GEOFENCE RADAR
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAnimationEnabled(!animationEnabled)}
            className="h-7 px-2 font-mono text-xs"
          >
            {animationEnabled ? '[SCANNING]' : '[PAUSED]'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative w-full">
          <svg
            viewBox={`-4 -4 ${width + 8} ${height + 8}`}
            preserveAspectRatio="xMidYMid meet"
            className="mx-auto w-11/12 h-auto"
            style={{ filter: '' }}
          >
            {/* Background */}
            <rect width={width} height={height} fill={colors.background} />

            {/* Grid lines - angle markers */}
            {[0, 30, 45, 60, 90, 120, 135, 150, 180].map(angle => {
              const end = polarToCartesian(angle, 100);
              return (
                <line
                  key={`angle-${angle}`}
                  x1={centerX}
                  y1={centerY}
                  x2={end.x}
                  y2={end.y}
                  stroke={colors.mutedForeground}
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  opacity="0.3"
                />
              );
            })}

            {/* Distance rings */}
            {distanceRings.map((distance, i) => {
              const radius = (distance / maxDistance) * maxRadius;
              return (
                <g key={`ring-${distance}`}>
                  {/* Arc */}
                  <path
                    d={generateArcPath(radius)}
                    fill="none"
                    stroke={colors.border}
                    strokeWidth="1"
                    opacity="0.5"
                  />
                  {/* Distance label */}
                  <text
                    x={centerX + 5}
                    y={centerY - radius + 5}
                    fill={colors.mutedForeground}
                    fontSize="10"
                    fontFamily="monospace"
                    opacity="0.9"
                  >
                    {distance}cm
                  </text>
                </g>
              );
            })}

            {/* Outer boundary semicircle */}
            <path
              d={generateArcPath(maxRadius)}
              fill="none"
              stroke={colors.primary}
              strokeWidth="2"
              opacity="0.35"
            />
            <line
              x1={centerX - maxRadius}
              y1={centerY}
              x2={centerX + maxRadius}
              y2={centerY}
              stroke={colors.primary}
              strokeWidth="2"
              opacity="0.2"
            />

            {/* Sweep line with glow effect */}
            <line
              x1={centerX}
              y1={centerY}
              x2={sweepLineEnd.x}
              y2={sweepLineEnd.y}
              stroke={colors.primary}
              strokeWidth="2"
              opacity="0.8"
              style={{
                filter: 'drop-shadow(0 0 6px rgba(0, 0, 0, 0.12))'
              }}
            />

            {/* Sweep gradient/fade effect */}
            <defs>
              <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="0" />
                <stop offset="100%" stopColor={colors.primary} stopOpacity="0.18" />
              </linearGradient>
            </defs>

            {/* Detected objects */}
            {sweepData.map((point, idx) => {
              const pos = polarToCartesian(point.angle, point.distance);
              const isCloseRange = point.distance < 30 && point.distance > 0;
              const isWithinBoundary = point.distance <= maxDistance;
              
              if (!isWithinBoundary) return null;

              return (
                <g key={`point-${idx}-${point.angle}`}>
                  {/* Object dot */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isCloseRange ? 6 : 4}
                    fill={isCloseRange ? colors.destructive : colors.primary}
                    opacity="0.9"
                    style={{
                      filter: `drop-shadow(0 0 ${isCloseRange ? 6 : 4}px rgba(0, 0, 0, 0.14))`
                    }}
                  >
                    <animate
                      attributeName="r"
                      values={isCloseRange ? "6;8;6" : "4;5;4"}
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  
                  {/* Distance label for close objects */}
                  {isCloseRange && (
                    <text
                      x={pos.x + 10}
                      y={pos.y - 5}
                      fill={colors.destructive}
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {point.distance.toFixed(1)}cm
                    </text>
                  )}
                </g>
              );
            })}

            {/* Center origin */}
            <circle
              cx={centerX}
              cy={centerY}
              r="4"
              fill={colors.primary}
              opacity="0.8"
            />

            {/* Angle labels */}
            <text x={centerX - 30} y={centerY + 20} fill={colors.mutedForeground} fontSize="12" fontFamily="monospace">
              90°
            </text>
            <text x={centerX + width / 2 - 40} y={centerY + 20} fill={colors.mutedForeground} fontSize="12" fontFamily="monospace">
              0°
            </text>
            <text x={20} y={centerY + 20} fill={colors.mutedForeground} fontSize="12" fontFamily="monospace">
              180°
            </text>
          </svg>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-muted-foreground">Safe Range (&gt;30cm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
              <span className="text-muted-foreground">Alert (&lt;30cm)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
