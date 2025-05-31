export type DieResult = {
    sides: number,
    value: number
}

export type Roll = {
    expression: string,
    dice: DieResult[][],
    result: number,
}

export type Rolls = {
    history: { roll: Roll, description: string, userId: string }[];
    heartbeats: {
        [userId: string]: number;
    };
};
