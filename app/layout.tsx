import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import SwRegister from './sw-register';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/Toast';

const geist = localFont({
  src: [
    {
      path: '../node_modules/geist/dist/fonts/geist-sans/Geist-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../node_modules/geist/dist/fonts/geist-sans/Geist-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../node_modules/geist/dist/fonts/geist-sans/Geist-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../node_modules/geist/dist/fonts/geist-sans/Geist-Black.woff2',
      weight: '900',
      style: 'normal',
    },
  ],
  variable: '--font-geist',
  display: 'swap',
});

const geistMono = localFont({
  src: [
    {
      path: '../node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../node_modules/geist/dist/fonts/geist-mono/GeistMono-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../node_modules/geist/dist/fonts/geist-mono/GeistMono-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Vistoria Cyble',
    template: '%s | Vistoria Cyble',
  },
  description: 'Registro fotografico de vistorias de troca de Cyble em apartamentos',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vistoria Cyble',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0c0f14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} ${geistMono.variable} dark`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('vistoria_theme');if(t==='light')document.documentElement.classList.replace('dark','light');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-accent focus:text-base focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold focus:outline-none">
              Pular para conteudo
            </a>
            <SwRegister />
            <div id="main-content" tabIndex={-1} />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
