import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'VGC Forge · Champions Team Builder',
  description: 'Team builder e damage calculator per Pokémon Champions, con supporto iniziale Regulation M-B.',
  openGraph: {
    title: 'VGC Forge · Champions Team Builder',
    description: 'Build legal Champions teams and read matchup evidence.',
    type: 'website',
    images: [{ url: `${siteOrigin}/og.png`, width: 1200, height: 630, alt: 'VGC Forge Matchup Field Map' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VGC Forge · Champions Team Builder',
    description: 'Build legal Champions teams and read matchup evidence.',
    images: [`${siteOrigin}/og.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* THESIS: an evidence-first tactical field map for building legal Champions teams and reading damage outcomes. OWN-WORLD: folded guide stock, cartographic panels, coastline dividers, crisp black ink. STORY: select a roster slot, tune the active set, read the route, compare every move. FIRST VIEWPORT: inspector, KO result, field state, outcomes matrix, team rail. FORM: cream canvas, angular map regions, semantic controls. FINISH: restrained transitions and responsive stacking. */}
        {children}
      </body>
    </html>
  );
}
