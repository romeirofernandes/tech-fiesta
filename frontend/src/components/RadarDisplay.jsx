import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

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
  const distanceRings = [20, 40, 60, 80, 100];
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
    const startAngle = 180;
    const endAngle = 0;
    const start = polarToCartesian(startAngle, (radius / maxRadius) * 100);
    const end = polarToCartesian(endAngle, (radius / maxRadius) * 100);
    
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
  };

  // Generate sweep line path
  const sweepLineEnd = polarToCartesian(sweepAngle, 100);

  return (
    <Card className={`${className} bg-slate-950 border-green-900/30`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-green-400 text-lg font-mono">
            GEOFENCE RADAR
          </CardTitle>
          <button
            onClick={() => setAnimationEnabled(!animationEnabled)}
            className="text-xs text-green-400/70 hover:text-green-400 font-mono"
          >
            {animationEnabled ? '[SCANNING]' : '[PAUSED]'}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg
            width={width}
            height={height}
            className="mx-auto"
            style={{ filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.3))' }}
          >
            {/* Background */}
            <rect width={width} height={height} fill="#020617" />

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
                  stroke="#16a34a"
                  strokeWidth="0.5"
                  opacity="0.2"
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
                    stroke="#16a34a"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                  {/* Distance label */}
                  <text
                    x={centerX + 5}
                    y={centerY - radius + 5}
                    fill="#16a34a"
                    fontSize="10"
                    fontFamily="monospace"
                    opacity="0.5"
                  >
                    {distance}cm
                  </text>
                </g>
              );
            })}

            {/* Sweep line with glow effect */}
            <line
              x1={centerX}
              y1={centerY}
              x2={sweepLineEnd.x}
              y2={sweepLineEnd.y}
              stroke="#22c55e"
              strokeWidth="2"
              opacity="0.8"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.8))'
              }}
            />

            {/* Sweep gradient/fade effect */}
            <defs>
              <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Detected objects */}
            {sweepData.map((point, idx) => {
              const pos = polarToCartesian(point.angle, point.distance);
              const isCloseRange = point.distance < 10;
              const isWithinBoundary = point.distance <= maxDistance;
              
              if (!isWithinBoundary) return null;

              return (
                <g key={`point-${idx}-${point.angle}`}>
                  {/* Object dot */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isCloseRange ? 6 : 4}
                    fill={isCloseRange ? '#ef4444' : '#22c55e'}
                    opacity="0.9"
                    style={{
                      filter: `drop-shadow(0 0 ${isCloseRange ? 6 : 4}px ${isCloseRange ? '#ef4444' : '#22c55e'})`
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
                      fill="#ef4444"
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
              fill="#22c55e"
              opacity="0.8"
            />

            {/* Angle labels */}
            <text x={centerX - 30} y={centerY + 20} fill="#16a34a" fontSize="12" fontFamily="monospace">
              90°
            </text>
            <text x={centerX + width / 2 - 40} y={centerY + 20} fill="#16a34a" fontSize="12" fontFamily="monospace">
              0°
            </text>
            <text x={20} y={centerY + 20} fill="#16a34a" fontSize="12" fontFamily="monospace">
              180°
            </text>
          </svg>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-green-400">Safe Range (&gt;10cm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-red-400">Alert (&lt;10cm)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
