import { Layer, Line, Circle } from 'react-konva'
import {
  MAP_X,
  MAP_Y,
  PX_PER_INCH,
  DEPLOYMENT_ZONES,
} from '../config/board'
import { useBoardStore } from '../store/boardStore'

const ZONE_BY_ID = new Map(DEPLOYMENT_ZONES.map((z) => [z.id, z]))

const ZONE_COLOR = '#fbbf24'
const ZONE_SHADOW = '#000'

const inchToX = (inches) => MAP_X + inches * PX_PER_INCH
const inchToY = (inches) => MAP_Y + inches * PX_PER_INCH

export function DeploymentZoneOverlay() {
  const zoneId = useBoardStore((s) => s.deploymentZone)
  const zone = ZONE_BY_ID.get(zoneId)
  if (!zone) return null
  const segments = zone.segments ?? []
  const circles = zone.circles ?? []
  if (segments.length === 0 && circles.length === 0) return null

  return (
    <Layer listening={false}>
      {segments.map(([x1, y1, x2, y2], idx) => (
        <Line
          key={`seg-${idx}`}
          points={[inchToX(x1), inchToY(y1), inchToX(x2), inchToY(y2)]}
          stroke={ZONE_COLOR}
          strokeWidth={3.5}
          lineCap="round"
          shadowColor={ZONE_SHADOW}
          shadowBlur={4}
          shadowOpacity={0.55}
        />
      ))}
      {circles.map((c, idx) => (
        <Circle
          key={`circ-${idx}`}
          x={inchToX(c.x)}
          y={inchToY(c.y)}
          radius={c.r * PX_PER_INCH}
          stroke={ZONE_COLOR}
          strokeWidth={3.5}
          shadowColor={ZONE_SHADOW}
          shadowBlur={4}
          shadowOpacity={0.55}
        />
      ))}
    </Layer>
  )
}
