import { Token, buildLexer, rule, alt, apply, kmid, lrec_sc, opt_sc, seq, str, tok, expectSingleResult, expectEOF } from 'typescript-parsec';

// AST Node Types
export enum Operator {
    ADD = '+',
    SUBTRACT = '-',
}

export enum KeepModifier {
    HIGHEST = 'k',
    LOWEST = 'kl',
}

export type NumberNode = { type: 'number'; value: number };
export type DiceRoll = {
    type: 'diceRoll';
    count: number;
    sides: number;
    modifier?: { type: KeepModifier; count: number };
};
export type BinaryOp = {
    type: 'binaryOp';
    operator: Operator;
    left: AstNode;
    right: AstNode;
};
export type GroupOp = {
    type: 'groupOp';
    expression: AstNode;
    groupOperator?: '-' | '+'; // '-' for disadvantage, '+' for advantage (or other future group ops)
};

export type AstNode = NumberNode | DiceRoll | BinaryOp | GroupOp;

// Tokenizer
export enum TokenKind {
    Number,
    D,
    K,
    KL,
    Add,
    Sub,
    LParen,
    RParen,
    Space,
}

const lexer = buildLexer([
    [true, /^\d+/g, TokenKind.Number],
    [true, /^d/ig, TokenKind.D], // Case-insensitive 'd' - Added 'g' flag
    [true, /^kl/ig, TokenKind.KL], // Added 'g' flag
    [true, /^k/ig, TokenKind.K], // Added 'g' flag
    [true, /^\+/g, TokenKind.Add],
    [true, /^-/g, TokenKind.Sub],
    [true, /^\(/g, TokenKind.LParen],
    [true, /^\)/g, TokenKind.RParen],
    [false, /^\s+/g, TokenKind.Space], // Skip whitespace
]);

// Parser Rules
const EXPR = rule<TokenKind, AstNode>();
const TERM = rule<TokenKind, AstNode>();
const DICE_ROLL = rule<TokenKind, DiceRoll>();
const NUMBER = rule<TokenKind, NumberNode>();
const GROUP = rule<TokenKind, GroupOp>();

// Literals and Basic Components
NUMBER.setPattern(
    apply(tok(TokenKind.Number), (token: Token<TokenKind.Number>): NumberNode => {
        return { type: 'number', value: parseInt(token.text, 10) };
    })
);

DICE_ROLL.setPattern(
    apply(
        seq(
            opt_sc(tok(TokenKind.Number)), // Optional dice count
            tok(TokenKind.D),
            tok(TokenKind.Number), // Sides
            opt_sc(seq(alt(tok(TokenKind.K), tok(TokenKind.KL)), tok(TokenKind.Number))) // Optional modifier (k/kl and count)
        ),
        ([countToken, _d, sidesToken, modifierTokens]): DiceRoll => {
            const count = countToken ? parseInt(countToken.text, 10) : 1;
            const sides = parseInt(sidesToken.text, 10);
            let modifier: DiceRoll['modifier'];
            if (modifierTokens) {
                const modType = modifierTokens[0].kind === TokenKind.K ? KeepModifier.HIGHEST : KeepModifier.LOWEST;
                const modCount = parseInt(modifierTokens[1].text, 10);
                modifier = { type: modType, count: modCount };
            }
            return { type: 'diceRoll', count, sides, modifier };
        }
    )
);

// Grouped Expressions (Parentheses)
GROUP.setPattern(
    apply(
        seq(
            kmid(tok(TokenKind.LParen), EXPR, tok(TokenKind.RParen)),
            opt_sc(alt(tok(TokenKind.Add), tok(TokenKind.Sub))) // Optional +/- suffix for advantage/disadvantage
        ),
        ([exprNode, opToken]): GroupOp => {
            let groupOperator: GroupOp['groupOperator'];
            if (opToken) {
                groupOperator = opToken.kind === TokenKind.Add ? '+' : '-';
            }
            return { type: 'groupOp', expression: exprNode, groupOperator };
        }
    )
);

TERM.setPattern(
    alt(NUMBER, DICE_ROLL, GROUP)
);

// Expression (Handles left-recursive addition/subtraction)
EXPR.setPattern(
    lrec_sc(
        TERM,
        seq(alt(tok(TokenKind.Add), tok(TokenKind.Sub)), TERM),
        (left: AstNode, [opToken, right]): BinaryOp => {
            const operator = opToken.kind === TokenKind.Add ? Operator.ADD : Operator.SUBTRACT;
            return { type: 'binaryOp', operator, left, right };
        }
    )
);

// Main parse function
export function parseDiceExpression(expression: string): AstNode {
    const tokens = lexer.parse(expression);
    return expectSingleResult(expectEOF(EXPR.parse(tokens)));
} 