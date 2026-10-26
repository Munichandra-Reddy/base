import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WorkOrbit - Cisco Workspace Platform',
  description: 'Project management, campfire chat, tasks, check-ins, and file sharing in one modern workspace.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-[#FFFFFF] text-[#222222] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
