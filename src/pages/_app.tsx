import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import '@fontsource/jetbrains-mono';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className="min-h-screen bg-black">
      <Component {...pageProps} />
    </main>
  );
}