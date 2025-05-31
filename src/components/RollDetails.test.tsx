import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RollDetailsImpl } from './RollDetails';
import { type DieResult } from '../state.types';

describe('RollDetails', () => {
    it('displays a simple roll correctly', () => {
        const dice: DieResult[][] = [[
            { sides: 6, value: 3 },
            { sides: 6, value: 4 }
        ]];

        render(<RollDetailsImpl dice={dice} />);

        // Check the accessible text
        expect(screen.getByLabelText('d6(3)+d6(4)')).toBeInTheDocument();

        // Also verify the visual representation
        const diceValues = screen.getAllByRole('text');
        expect(diceValues).toHaveLength(2);
        expect(diceValues[0]).toHaveTextContent('3');
        expect(diceValues[1]).toHaveTextContent('4');
    });

    it('displays multiple dice groups with + between them', () => {
        const dice: DieResult[][] = [
            [{ sides: 8, value: 5 }],
            [{ sides: 4, value: 2 }]
        ];

        render(<RollDetailsImpl dice={dice} />);

        // Check the accessible text
        expect(screen.getByLabelText('d8(5) + d4(2)')).toBeInTheDocument();

        // Also verify the visual representation
        const diceValues = screen.getAllByRole('text');
        expect(diceValues).toHaveLength(2);
        expect(diceValues[0]).toHaveTextContent('5');
        expect(diceValues[1]).toHaveTextContent('2');
    });

    it('displays advantage/disadvantage rolls side by side', () => {
        const dice: DieResult[][] = [
            [{ sides: 8, value: 1 }, { sides: 4, value: 3 }],
            [{ sides: 8, value: 3 }, { sides: 4, value: 4 }]
        ];

        render(<RollDetailsImpl dice={dice} />);

        // Check the accessible text
        expect(screen.getByLabelText('d8(1)+d4(3), d8(3)+d4(4)')).toBeInTheDocument();

        // Also verify the visual representation
        const diceValues = screen.getAllByRole('text');
        expect(diceValues).toHaveLength(4);
        expect(diceValues[0]).toHaveTextContent('1');
        expect(diceValues[1]).toHaveTextContent('3');
        expect(diceValues[2]).toHaveTextContent('3');
        expect(diceValues[3]).toHaveTextContent('4');
    });

    it('handles complex expressions correctly', () => {
        const dice: DieResult[][] = [
            [{ sides: 20, value: 15 }],
            [{ sides: 4, value: 2 }],
            [{ sides: 6, value: 3 }, { sides: 6, value: 4 }]
        ];

        render(<RollDetailsImpl dice={dice} />);

        // Check the accessible text
        expect(screen.getByLabelText('d20(15) + d4(2) + d6(3)+d6(4)')).toBeInTheDocument();

        // Also verify the visual representation
        const diceValues = screen.getAllByRole('text');
        expect(diceValues).toHaveLength(4);
        expect(diceValues[0]).toHaveTextContent('15');
        expect(diceValues[1]).toHaveTextContent('2');
        expect(diceValues[2]).toHaveTextContent('3');
        expect(diceValues[3]).toHaveTextContent('4');
    });
}); 