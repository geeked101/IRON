import {
  suggestProgression,
  estimateOneRepMax,
  calculateCaloricTarget,
  generateBulkInsight,
  calculateWorkoutStreak,
} from '../progressiveOverload'

describe('progressiveOverload utilities', () => {
  describe('estimateOneRepMax', () => {
    it('returns exact weight for 1 rep', () => {
      expect(estimateOneRepMax(100, 1)).toBe(100)
    })

    it('accurately estimates 1RM using Brzycki formula', () => {
      // 100kg x 10 reps => 100 / (1.0278 - 0.278) = 100 / 0.7498 = ~133.3 -> 133
      expect(estimateOneRepMax(100, 10)).toBe(133)
    })
  })

  describe('calculateCaloricTarget', () => {
    it('calculates calories and protein for lean-bulk', () => {
      const result = calculateCaloricTarget(75, 175, 25, 'lean-bulk', 'male', 'kg')
      expect(result.protein).toBe(165) // 75 * 2.2 = 165
      expect(result.calories).toBeGreaterThan(2000)
    })

    it('applies cut calorie deficit correctly', () => {
      const bulk = calculateCaloricTarget(75, 175, 25, 'lean-bulk', 'male', 'kg')
      const cut = calculateCaloricTarget(75, 175, 25, 'cut', 'male', 'kg')
      expect(bulk.calories - cut.calories).toBe(650) // 250 - (-400) = 650
    })
  })

  describe('suggestProgression', () => {
    it('returns null when no sessions match exercise', () => {
      const result = suggestProgression('Bench Press', [], 8)
      expect(result).toBeNull()
    })

    it('recommends weight increase when all target reps are hit', () => {
      const sessions = [
        {
          id: '1',
          uid: 'u1',
          day: 1,
          dayName: 'Push',
          durationMinutes: 45,
          exercises: [
            {
              name: 'Bench Press',
              sets: [
                { weight: 80, reps: 8, done: true },
                { weight: 80, reps: 8, done: true },
                { weight: 80, reps: 8, done: true },
              ],
            },
          ],
          totalVolume: 1920,
          prs: [],
          notes: '',
          loggedAt: new Date(),
        },
      ]
      const result = suggestProgression('Bench Press', sessions as any, 8, 2.5)
      expect(result).not.toBeNull()
      expect(result?.type).toBe('increase')
      expect(result?.weightChange).toBe(2.5)
    })
  })

  describe('generateBulkInsight', () => {
    it('prompts user to keep logging when weight history < 7 days', () => {
      const result = generateBulkInsight([70, 70.2], 2500, 2500, 'lean-bulk')
      expect(result.type).toBe('on-track')
      expect(result.message).toContain('1 week')
    })
  })
})
