import { describe, it, expect } from 'vitest';
import { parseDiceExpression, DiceRoll, KeepModifier, Operator, AstNode } from './roll-parser';

describe('parseDiceExpression', () => {
    it('should parse a simple dice roll (2d6)', () => {
        const expression = '2d6';
        const expectedAst: DiceRoll = {
            type: 'diceRoll',
            count: 2,
            sides: 6,
        };
        expect(parseDiceExpression(expression)).toEqual(expectedAst);
    });

    it('should parse a single die roll (d103)', () => {
        const expression = 'd103';
        const expectedAst: DiceRoll = {
            type: 'diceRoll',
            count: 1, // Implicit 1
            sides: 103,
        };
        expect(parseDiceExpression(expression)).toEqual(expectedAst);
    });

    it('should parse addition and subtraction (1d6+1d4-1)', () => {
        const expression = '1d6+1d4-1';
        const expectedAst: AstNode = {
            type: 'binaryOp',
            operator: Operator.SUBTRACT,
            left: {
                type: 'binaryOp',
                operator: Operator.ADD,
                left: { type: 'diceRoll', count: 1, sides: 6 },
                right: { type: 'diceRoll', count: 1, sides: 4 },
            },
            right: { type: 'number', value: 1 },
        };
        expect(parseDiceExpression(expression)).toEqual(expectedAst);
    });

    it('should parse keep lowest (3d6kl2)', () => {
        const expression = '3d6kl2';
        const expectedAst: DiceRoll = {
            type: 'diceRoll',
            count: 3,
            sides: 6,
            modifier: { type: KeepModifier.LOWEST, count: 2 },
        };
        expect(parseDiceExpression(expression)).toEqual(expectedAst);
    });

    it('should parse keep highest (3d6k2)', () => {
        const expression = '3d6k2';
        const expectedAst: DiceRoll = {
            type: 'diceRoll',
            count: 3,
            sides: 6,
            modifier: { type: KeepModifier.HIGHEST, count: 2 },
        };
        expect(parseDiceExpression(expression)).toEqual(expectedAst);
    });

    it('should parse parentheses with advantage/disadvantage ((1d8 + 1d4)-)', () => {
        const expression = '(1d8 + 1d4)-';
        const expectedAst: AstNode = {
            type: 'groupOp',
            expression: {
                type: 'binaryOp',
                operator: Operator.ADD,
                left: { type: 'diceRoll', count: 1, sides: 8 },
                right: { type: 'diceRoll', count: 1, sides: 4 },
            },
            groupOperator: '-', // Disadvantage
        };
        expect(parseDiceExpression(expression)).toEqual(expectedAst);
    });

    it('should parse parentheses without operator ( (1d6) )', () => {
        const expression = '(1d6)';
        const expectedAst: AstNode = {
            type: 'groupOp',
            expression: { type: 'diceRoll', count: 1, sides: 6 },
            // No groupOperator implies just grouping
        };
        expect(parseDiceExpression(expression)).toEqual(expectedAst);
    });

    it('should handle whitespace correctly ( 2 d 6 + 1 d 4 - 1 )', () => {
        const expression = ' 2 d 6 + 1 d 4 - 1 ';
        const expectedAst: AstNode = {
            type: 'binaryOp',
            operator: Operator.SUBTRACT,
            left: {
                type: 'binaryOp',
                operator: Operator.ADD,
                left: { type: 'diceRoll', count: 2, sides: 6 },
                right: { type: 'diceRoll', count: 1, sides: 4 },
            },
            right: { type: 'number', value: 1 },
        };
        expect(parseDiceExpression(expression)).toEqual(expectedAst);
    });
}); 