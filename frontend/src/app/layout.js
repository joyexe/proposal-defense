import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';
import AppShell from './components/AppShell';
import { MoodProvider } from './contexts/MoodContext';
import Script from 'next/script';

export const metadata = {
  title: 'Amieti',
  description: 'Comprehensive health and mental wellness solution for schools',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <MoodProvider>
          <AppShell>
            {children}
          </AppShell>
        </MoodProvider>
        <Script 
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
