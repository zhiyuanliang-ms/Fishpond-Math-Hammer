import { Layer, Line, Rect, Text } from 'react-konva'
import {
  MAP_X,
  MAP_Y,
  MAP_W,
  MAP_H,
  MAP_W_IN,
  MAP_H_IN,
  PX_PER_INCH,
  STAGE_W,
  STAGE_H,
} from '../config/board'

const LONG_TICKS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const SHORT_TICKS = [5, 10, 15, 20, 22, 24, 29, 34, 39]

const longLabel = (offset) => (offset <= 30 ? offset : 60 - offset)
const shortLabel = (offset) => (offset <= 22 ? offset : 44 - offset)

const RULER_GAP = 6
const RULER_FONT = 11
const RULER_COLOR = '#a0a0a0'

export function BoardBackground() {
  const verticals = []
  const longTickSet = new Set(LONG_TICKS)
  for (let i = 0; i <= MAP_W_IN; i++) {
    const x = MAP_X + i * PX_PER_INCH
    const major = longTickSet.has(i)
    verticals.push(
      <Line
        key={`v-${i}`}
        points={[x, MAP_Y, x, MAP_Y + MAP_H]}
        stroke={major ? '#555' : '#3a3a3a'}
        strokeWidth={major ? 1.25 : 0.5}
        listening={false}
      />,
    )
  }

  const horizontals = []
  const shortTickSet = new Set(SHORT_TICKS)
  for (let i = 0; i <= MAP_H_IN; i++) {
    const y = MAP_Y + i * PX_PER_INCH
    const major = shortTickSet.has(i)
    horizontals.push(
      <Line
        key={`h-${i}`}
        points={[MAP_X, y, MAP_X + MAP_W, y]}
        stroke={major ? '#555' : '#3a3a3a'}
        strokeWidth={major ? 1.25 : 0.5}
        listening={false}
      />,
    )
  }

  const labels = []
  const labelW = 24
  const labelH = RULER_FONT + 2

  for (const inches of LONG_TICKS) {
    const x = MAP_X + inches * PX_PER_INCH
    const text = String(longLabel(inches))
    labels.push(
      <Text key={`top-${inches}`} x={x - labelW / 2} y={MAP_Y - RULER_GAP - labelH}
        width={labelW} height={labelH} text={text} fontSize={RULER_FONT} fill={RULER_COLOR}
        align="center" verticalAlign="middle" listening={false} />,
    )
    labels.push(
      <Text key={`bot-${inches}`} x={x - labelW / 2} y={MAP_Y + MAP_H + RULER_GAP}
        width={labelW} height={labelH} text={text} fontSize={RULER_FONT} fill={RULER_COLOR}
        align="center" verticalAlign="middle" listening={false} />,
    )
  }

  for (const inches of SHORT_TICKS) {
    const y = MAP_Y + inches * PX_PER_INCH
    const text = String(shortLabel(inches))
    labels.push(
      <Text key={`left-${inches}`} x={MAP_X - RULER_GAP - labelW} y={y - labelH / 2}
        width={labelW} height={labelH} text={text} fontSize={RULER_FONT} fill={RULER_COLOR}
        align="right" verticalAlign="middle" listening={false} />,
    )
    labels.push(
      <Text key={`right-${inches}`} x={MAP_X + MAP_W + RULER_GAP} y={y - labelH / 2}
        width={labelW} height={labelH} text={text} fontSize={RULER_FONT} fill={RULER_COLOR}
        align="left" verticalAlign="middle" listening={false} />,
    )
  }

  return (
    <Layer listening={false}>
      <Rect x={0} y={0} width={STAGE_W} height={STAGE_H} fill="#1a1a1a" />
      <Rect x={MAP_X} y={MAP_Y} width={MAP_W} height={MAP_H} fill="#2a2a2a"
        stroke="#555" strokeWidth={2} />
      {verticals}
      {horizontals}
      <Rect x={MAP_X} y={MAP_Y} width={MAP_W} height={MAP_H} stroke="#888"
        strokeWidth={2} listening={false} />
      {labels}
    </Layer>
  )
}
