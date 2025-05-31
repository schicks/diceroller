import React from 'react';
import { type DieResult as DieResultType } from '../state.types';
import { DieResult } from './DieResult';
import './RollDetails.css';

interface RollDetailsProps {
    dice: DieResultType[][];
}

export function RollDetailsImpl({ dice }: RollDetailsProps) {
    // If there are exactly 2 arrays and they have the same length pattern,
    // it's likely an advantage/disadvantage roll that should be displayed side by side
    const isAdvantageRoll = dice.length === 2 &&
        dice[0].length === dice[1].length &&
        dice[0].every((die, i) => die.sides === dice[1][i].sides);

    const DieGroup = ({ dieSet }: { dieSet: DieResultType[] }) => (
        <>
            {dieSet.map((die, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <span className="operator">+</span>}
                    <DieResult sides={die.sides} value={die.value} />
                </React.Fragment>
            ))}
        </>
    );

    if (isAdvantageRoll) {
        // For advantage/disadvantage rolls, display each complete roll set together
        return (
            <span className="roll-details">
                <DieGroup dieSet={dice[0]} />
                <span className="separator">,</span>
                <DieGroup dieSet={dice[1]} />
            </span>
        );
    }

    // For normal rolls, join each group with + between groups
    return (
        <span className="roll-details">
            {dice.map((dieSet, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span className="operator">+</span>}
                    <DieGroup dieSet={dieSet} />
                </React.Fragment>
            ))}
        </span>
    );
}

// Wrapper component for easier testing
export default function RollDetails(props: RollDetailsProps) {
    return <RollDetailsImpl {...props} />;
} 