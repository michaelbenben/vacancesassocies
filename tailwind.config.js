/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: 'var(--color-primary)',
                    dark: 'var(--color-primary-dark)',
                    light: 'var(--color-primary-light)',
                },
                secondary: 'hsl(var(--hue-secondary), 60%, 50%)', // Fallback or computed
                text: {
                    main: 'var(--color-text-main)',
                    muted: 'var(--color-text-muted)',
                    light: 'var(--color-text-light)',
                },
                bg: {
                    body: 'var(--color-bg-body)',
                    surface: 'var(--color-bg-surface)',
                },
                danger: 'var(--color-danger)',
            },
            fontFamily: {
                sans: ['var(--font-sans)', 'sans-serif'],
            },
            boxShadow: {
                glass: 'var(--shadow-glass)',
            }
        },
    },
    plugins: [],
}
