import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Weather • Your Location',
  description: 'Simple SPA showing weather for your current GPS position.',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: '#0b1020',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}