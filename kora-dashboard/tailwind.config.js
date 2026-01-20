/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                kora: {
                    dark: '#0a0a0a',
                    card: '#111111',
                    border: '#333333',
                    primary: '#14F195', 
                    secondary: '#9945FF', 
                }
            },
            fontFamily: {
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            animation: {
                shimmer: 'shimmer 2s linear infinite',
            },
            keyframes: {
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                }
            }
        },
    },
    plugins: [],
}