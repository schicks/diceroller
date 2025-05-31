import type { Roll, DieResult } from './state.types'
import { parseDiceExpression, AstNode, DiceRoll as AstDiceRoll, NumberNode, BinaryOp, GroupOp, Operator, KeepModifier } from './roll-parser'

// Helper to evaluate an AST node to a numerical result and collected dice rolls
const evaluateAstNode = (node: AstNode, random: () => number): { result: number, dice: DieResult[][] } => {
    const allDiceRolledThisEvaluation: DieResult[][] = []

    const rollAndCollect = (count: number, sides: number, modifier?: AstDiceRoll['modifier']): number => {
        const currentDiceGroup: DieResult[] = []
        const individualRollValues: number[] = []
        for (let i = 0; i < count; i++) {
            const value = Math.floor(random() * sides) + 1
            currentDiceGroup.push({ sides, value })
            individualRollValues.push(value)
        }
        allDiceRolledThisEvaluation.push(currentDiceGroup)

        if (modifier) {
            individualRollValues.sort((a, b) => a - b) // Sort ascending
            let diceToSum: number[]
            if (modifier.type === KeepModifier.HIGHEST) {
                diceToSum = individualRollValues.slice(-modifier.count)
            } else { // LOWEST
                diceToSum = individualRollValues.slice(0, modifier.count)
            }
            return diceToSum.reduce((sum, val) => sum + val, 0)
        }
        return individualRollValues.reduce((sum, val) => sum + val, 0)
    }

    switch (node.type) {
        case 'number':
            return { result: node.value, dice: [] }
        case 'diceRoll':
            const rollResult = rollAndCollect(node.count, node.sides, node.modifier)
            return { result: rollResult, dice: allDiceRolledThisEvaluation }
        case 'binaryOp':
            const leftEval = evaluateAstNode(node.left, random)
            const rightEval = evaluateAstNode(node.right, random)
            const combinedDice = leftEval.dice.concat(rightEval.dice)
            if (node.operator === Operator.ADD) {
                return { result: leftEval.result + rightEval.result, dice: combinedDice }
            }
            return { result: leftEval.result - rightEval.result, dice: combinedDice }
        case 'groupOp':
            if (node.groupOperator === '-') { // Disadvantage: roll twice, take lowest
                const eval1 = evaluateAstNode(node.expression, random)
                const eval2 = evaluateAstNode(node.expression, random)
                // The dice array for advantage/disadvantage should reflect both sets of rolls
                const groupDice = [eval1.dice.flat(), eval2.dice.flat()]
                if (eval1.result <= eval2.result) {
                    return { result: eval1.result, dice: groupDice }
                }
                return { result: eval2.result, dice: groupDice }
            }
            // Add handling for '+' (advantage) or other group operators if introduced
            // For now, just evaluate the inner expression if no specific groupOperator like '-' is present
            return evaluateAstNode(node.expression, random)
        default:
            // Should not happen with a well-formed AST from the parser
            throw new Error(`Unknown AST node type`)
    }
}

export const createRollFunction = (random: () => number) => {
    return (expression: string): Roll => {
        const ast = parseDiceExpression(expression)
        const { result, dice } = evaluateAstNode(ast, random)

        return {
            expression,
            dice, // This should now be correctly DieResult[][]
            result,
        }
    }
}

export const roll = createRollFunction(Math.random) 