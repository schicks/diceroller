interface DieResultProps {
    sides: number;
    value: number;
    size?: number;
}

export function DieResult({ sides, value, size = 32 }: DieResultProps) {
    // Get the shape path and viewBox for the die
    const getDieShape = (sides: number): { path: string; viewBox: string } => {
        switch (sides) {
            case 2:
                return {
                    path: `M ${size / 2},${size / 10} 
                          A ${size * 0.4},${size * 0.4} 0 1,1 ${size / 2},${size * 0.9} 
                          A ${size * 0.4},${size * 0.4} 0 1,1 ${size / 2},${size / 10}`,
                    viewBox: `0 0 ${size} ${size}`
                };
            case 3:
                return {
                    path: `M ${size / 2},${size / 10} 
                          L ${size * 0.9},${size * 0.85} 
                          L ${size * 0.1},${size * 0.85} Z`,
                    viewBox: `0 0 ${size} ${size}`
                };
            case 4:
                return {
                    path: `M ${size / 2},${size / 10} 
                          L ${size * 0.9},${size / 2} 
                          L ${size / 2},${size * 0.9} 
                          L ${size * 0.1},${size / 2} Z`,
                    viewBox: `0 0 ${size} ${size}`
                };
            case 6:
                return {
                    path: `M ${size * 0.1},${size * 0.1} 
                          L ${size * 0.9},${size * 0.1} 
                          L ${size * 0.9},${size * 0.9} 
                          L ${size * 0.1},${size * 0.9} Z`,
                    viewBox: `0 0 ${size} ${size}`
                };
            case 8:
                return {
                    path: `M ${size / 2},${size / 10} 
                          L ${size * 0.85},${size * 0.3} 
                          L ${size * 0.85},${size * 0.7} 
                          L ${size / 2},${size * 0.9} 
                          L ${size * 0.15},${size * 0.7} 
                          L ${size * 0.15},${size * 0.3} Z`,
                    viewBox: `0 0 ${size} ${size}`
                };
            case 20:
                // Simplified icosahedron representation as hexagon
                return {
                    path: `M ${size / 2},${size / 10} 
                          L ${size * 0.85},${size * 0.3} 
                          L ${size * 0.85},${size * 0.7} 
                          L ${size / 2},${size * 0.9} 
                          L ${size * 0.15},${size * 0.7} 
                          L ${size * 0.15},${size * 0.3} Z`,
                    viewBox: `0 0 ${size} ${size}`
                };
            default:
                // Default to circle for any other die
                return {
                    path: `M ${size / 2},${size / 10} 
                          A ${size * 0.4},${size * 0.4} 0 1,1 ${size / 2},${size * 0.9} 
                          A ${size * 0.4},${size * 0.4} 0 1,1 ${size / 2},${size / 10}`,
                    viewBox: `0 0 ${size} ${size}`
                };
        }
    };

    const { path, viewBox } = getDieShape(sides);

    // Calculate font size based on the number of digits
    const digitCount = value.toString().length;
    const fontSize = size / (1.8 + (digitCount - 1) * 0.3); // Reduce size for more digits

    const dieText = `d${sides}(${value})`;

    return (
        <svg
            width={size}
            height={size}
            viewBox={viewBox}
            style={{ display: 'inline-block', verticalAlign: 'middle' }}
            role="img"
            aria-label={`Die value: ${dieText}`}
        >
            <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth={size / 16}
            />
            <text
                x="50%"
                y="53%"
                dominantBaseline="central"
                textAnchor="middle"
                fontSize={fontSize}
                fill="currentColor"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                role="text"
            >
                {value}
            </text>
        </svg>
    );
} 