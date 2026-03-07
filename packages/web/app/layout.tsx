import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'RepoPulse AI - GitHub Repository Analyzer',
    description: 'Analyze architecture, health, and risks of any GitHub repository.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
