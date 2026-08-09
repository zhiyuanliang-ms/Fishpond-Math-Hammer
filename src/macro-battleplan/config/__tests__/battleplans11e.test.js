import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  FORCE_DISPOSITIONS,
  LAYOUTS,
  findBattleplan,
  getMissionCardImages,
} from '../battleplans11e'

const publicRoot = fileURLToPath(new URL('../../../../public/', import.meta.url))

const publicAssetExists = (url) => existsSync(fileURLToPath(new URL(`.${url}`, `file:///${publicRoot}/`)))

describe('11e Force Disposition matrix', () => {
  it('resolves every directed matchup and all of its mission card assets', () => {
    const fronts = new Set()
    const backs = new Set()

    for (const mine of FORCE_DISPOSITIONS) {
      for (const theirs of FORCE_DISPOSITIONS) {
        for (const layout of LAYOUTS) {
          const battleplan = findBattleplan(mine.id, theirs.id, layout)

          expect(battleplan).not.toBeNull()
          expect(battleplan.mine.disposition).toBe(mine.id)
          expect(battleplan.theirs.disposition).toBe(theirs.id)
          expect(battleplan.layout).toBe(layout)

          for (const side of [battleplan.mine, battleplan.theirs]) {
            const images = getMissionCardImages(side.disposition, side.mission)
            expect(images).not.toBeNull()
            expect(publicAssetExists(images.front)).toBe(true)
            fronts.add(images.front)

            if (images.back) {
              expect(publicAssetExists(images.back)).toBe(true)
              backs.add(images.back)
            }
          }
        }
      }
    }

    expect(fronts.size).toBe(25)
    expect(backs.size).toBe(11)
  })
})