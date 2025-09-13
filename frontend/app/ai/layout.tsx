import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FinHelm AI CFO - Chat Assistant',
  description: 'AI-powered CFO assistant for QuickBooks users',
};

export default function AILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}