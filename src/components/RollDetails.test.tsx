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
        expect(screen.getByText('d6(3)+d6(4)')).toBeInTheDocument();
    });

    it('displays multiple dice groups with + between them', () => {
        const dice: DieResult[][] = [
            [{ sides: 8, value: 5 }],
            [{ sides: 4, value: 2 }]
        ];

        render(<RollDetailsImpl dice={dice} />);
        expect(screen.getByText('d8(5) + d4(2)')).toBeInTheDocument();
    });

    it('displays advantage/disadvantage rolls side by side', () => {
        const dice: DieResult[][] = [
            [{ sides: 8, value: 1 }, { sides: 4, value: 3 }],
            [{ sides: 8, value: 3 }, { sides: 4, value: 4 }]
        ];

        render(<RollDetailsImpl dice={dice} />);
        expect(screen.getByText('d8(1)+d4(3), d8(3)+d4(4)')).toBeInTheDocument();
    });

    it('handles complex expressions correctly', () => {
        const dice: DieResult[][] = [
            [{ sides: 20, value: 15 }],
            [{ sides: 4, value: 2 }],
            [{ sides: 6, value: 3 }, { sides: 6, value: 4 }]
        ];

        render(<RollDetailsImpl dice={dice} />);
        expect(screen.getByText('d20(15) + d4(2) + d6(3)+d6(4)')).toBeInTheDocument();
    });
}); 