// Inline SVG die face. Drop-in replacement for the Unicode glyphs (U+2680..2685).
// Why SVG: Unicode dice glyphs render with very different vertical metrics
// across platforms (iOS in particular renders pips low inside the em-box),
// which breaks centering no matter what the CSS does. SVG gives identical
// pixel-perfect output everywhere.
//
// Sized to `1em` so it behaves like the old glyph: just set `font-size` on
// the parent and the icon scales. Color is `currentColor`.

const PIPS = {
  1: [[12, 12]],
  2: [[7, 7], [17, 17]],
  3: [[7, 7], [12, 12], [17, 17]],
  4: [[7, 7], [17, 7], [7, 17], [17, 17]],
  5: [[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]],
  6: [[7, 7], [17, 7], [7, 12], [17, 12], [7, 17], [17, 17]],
}

export default function DieFace({ face, className, title }) {
  const pips = PIPS[face]
  if (!pips) return null
  const labelled = Boolean(title)
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden={labelled ? undefined : true}
      role={labelled ? 'img' : undefined}
      focusable="false"
    >
      {labelled ? <title>{title}</title> : null}
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {pips.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="currentColor" />
      ))}
    </svg>
  )
}
