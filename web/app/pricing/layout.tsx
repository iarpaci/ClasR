import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — CLASR',
  description: 'Choose your CLASR plan. Trial Pack, Regular, Professional, and Enterprise options for academic manuscript signal reading.',
  openGraph: { title: 'Pricing — CLASR', description: 'Trial Pack ($25 one-time), Regular ($49/mo), Professional ($79/mo), and Enterprise pricing for CLASR.' },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
