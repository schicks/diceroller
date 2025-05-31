import { describe, it, expect, vi } from 'vitest'
import { createRollFunction, roll } from './roll'
import type { Roll } from './state.types'

describe('roll', () => {
    it('should export a default function that uses Math.random', () => {
        expect(roll).toBeDefined()
        expect(typeof roll).toBe('function')
    })

    describe('basic dice expressions', () => {
        it('should roll 2d6', () => {
            const mockRandom = vi.fn()
                .mockReturnValueOnce(0.5) // 4
                .mockReturnValueOnce(0.8) // 5

            const testRoll = createRollFunction(mockRandom)
            const result = testRoll('2d6')

            expect(result).toEqual({
                expression: '2d6',
                dice: [[
                    { sides: 6, value: 4 },
                    { sides: 6, value: 5 }
                ]],
                result: 9
            })
            expect(mockRandom).toHaveBeenCalledTimes(2)
        })

        it('should roll 1d103', () => {
            const mockRandom = vi.fn().mockReturnValue(0.5)
            const testRoll = createRollFunction(mockRandom)
            const result = testRoll('1d103')

            expect(result).toEqual({
                expression: '1d103',
                dice: [[{ sides: 103, value: 52 }]],
                result: 52
            })
        })
    })

    describe('complex expressions', () => {
        it('should handle addition and subtraction', () => {
            const mockRandom = vi.fn()
                .mockReturnValueOnce(0.5) // 4 (1d6)
                .mockReturnValueOnce(0.75) // 4 (1d4)

            const testRoll = createRollFunction(mockRandom)
            const result = testRoll('1d6+1d4-1')

            expect(result).toEqual({
                expression: '1d6+1d4-1',
                dice: [
                    [{ sides: 6, value: 4 }],
                    [{ sides: 4, value: 4 }]
                ],
                result: 7 // 4 + 4 - 1
            })
        })

        it('should handle keep lowest', () => {
            const mockRandom = vi.fn()
                .mockReturnValueOnce(0.1) // 1
                .mockReturnValueOnce(0.5) // 4
                .mockReturnValueOnce(0.9) // 6

            const testRoll = createRollFunction(mockRandom)
            const result = testRoll('3d6kl2')

            expect(result).toEqual({
                expression: '3d6kl2',
                dice: [[
                    { sides: 6, value: 1 },
                    { sides: 6, value: 4 },
                    { sides: 6, value: 6 }
                ]],
                result: 5 // sum of lowest 2 (1 + 4)
            })
        })

        it('should handle keep highest', () => {
            const mockRandom = vi.fn()
                .mockReturnValueOnce(0.1) // 1
                .mockReturnValueOnce(0.5) // 4
                .mockReturnValueOnce(0.9) // 6

            const testRoll = createRollFunction(mockRandom)
            const result = testRoll('3d6k2')

            expect(result).toEqual({
                expression: '3d6k2',
                dice: [[
                    { sides: 6, value: 1 },
                    { sides: 6, value: 4 },
                    { sides: 6, value: 6 }
                ]],
                result: 10 // sum of highest 2 (4 + 6)
            })
        })

        it('should handle parentheses with lowest result', () => {
            const mockRandom = vi.fn()
                // First roll
                .mockReturnValueOnce(0.9) // 8 (1d8)
                .mockReturnValueOnce(0.75) // 4 (1d4)
                // Second roll
                .mockReturnValueOnce(0.1) // 1 (1d8)
                .mockReturnValueOnce(0.25) // 2 (1d4)

            const testRoll = createRollFunction(mockRandom)
            const result = testRoll('(1d8 + 1d4)-')

            expect(result).toEqual({
                expression: '(1d8 + 1d4)-',
                dice: [
                    [
                        { sides: 8, value: 8 },
                        { sides: 4, value: 4 }
                    ],
                    [
                        { sides: 8, value: 1 },
                        { sides: 4, value: 2 }
                    ]
                ],
                result: 3 // lowest of (12, 3)
            })
        })
    })
}) 