import './globals.css';

export const metadata = {
  title: 'Next.js + BrowserPod',
  description: 'Next.js running inside BrowserPod',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
