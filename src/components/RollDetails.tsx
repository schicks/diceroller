import React from 'react';
import { type DieResult as DieResultType } from '../state.types';
import { DieResult } from './DieResult';
import './RollDetails.css';

interface RollDetailsProps {
    dice: DieResultType[][];
}

function formatDieText(die: DieResultType): string {
    return `d${die.sides}(${die.value})`;
}

function formatDieGroupText(dieSet: DieResultType[]): string {
    return dieSet.map(formatDieText).join('+');
}

export function RollDetailsImpl({ dice }: RollDetailsProps) {
    // If there are exactly 2 arrays and they have the same length pattern,
    // it's likely an advantage/disadvantage roll that should be displayed side by side
    const isAdvantageRoll = dice.length === 2 &&
        dice[0].length === dice[1].length &&
        dice[0].every((die, i) => die.sides === dice[1][i].sides);

    const DieGroup = ({ dieSet }: { dieSet: DieResultType[] }) => {
        return (
            <span>
                {dieSet.map((die, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && <span className="operator" aria-hidden="true">+</span>}
                        <DieResult sides={die.sides} value={die.value} />
                    </React.Fragment>
                ))}
            </span>
        );
    };

    if (isAdvantageRoll) {
        // For advantage/disadvantage rolls, display each complete roll set together
        const fullText = `${formatDieGroupText(dice[0])}, ${formatDieGroupText(dice[1])}`;
        return (
            <span className="roll-details" aria-label={fullText}>
                <DieGroup dieSet={dice[0]} />
                <span className="separator" aria-hidden="true">,</span>
                <DieGroup dieSet={dice[1]} />
            </span>
        );
    }

    // For normal rolls, join each group with + between groups
    const fullText = dice.map(formatDieGroupText).join(' + ');
    return (
        <span className="roll-details" aria-label={fullText}>
            {dice.map((dieSet, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span className="operator" aria-hidden="true">+</span>}
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