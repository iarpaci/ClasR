'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isLoggedIn } from '@/lib/auth';

const FUNCTIONS = [
  { id: '01', label: 'Structural Review', desc: 'IMRaD flow, section organization, contribution visibility, first-screening signals', plan: 'Basic' },
  { id: '02', label: 'Methodological Visibility', desc: 'Data, sampling, measurement, validity, reproducibility gaps', plan: 'Basic' },
  { id: '03', label: 'Reference Check', desc: 'Citation–reference matching, missing entries, year mismatches, literature use', plan: 'Free' },
  { id: '04', label: 'Inconsistency Detection', desc: 'Aim–method–results–conclusion mismatches, evidence-boundary violations', plan: 'Free' },
  { id: '05', label: 'Red Flags', desc: 'Critical academic risks, overclaims, desk-screening threats', plan: 'Free' },
  { id: '06', label: 'Final Integrated Review', desc: 'One-paragraph Q1-style humanized reviewer report', plan: 'Pro' },
];

export default function LandingPage() {
  const router = useRouter();
  useEffect(() => { if (isLoggedIn()) router.replace('/dashboard'); }, [router]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-900 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-xl font-black tracking-widest text-white">CLASR</span>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-gray-400 hover:text-white text-sm transition-colors">Pricing</Link>
          <Link href="/login" className="text-gray-400 hover:text-white text-sm transition-colors">Sign in</Link>
          <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-950 border border-blue-800 text-blue-300 text-xs px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
          AI-powered · 24 signal kits · SECTION 0–8
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-6">
          Read your manuscript<br />
          <span className="text-blue-400">the way a reviewer does</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          CLASR identifies structural, methodological, citation, and evidence-boundary signals in English academic manuscripts — before peer review does.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register"
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base">
            Start free — 5 analyses included
          </Link>
          <Link href="/pricing"
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold px-8 py-3.5 rounded-xl transition-colors text-base">
            See pricing
          </Link>
        </div>
        <p className="text-gray-600 text-xs mt-4">No credit card required · PDF · DOCX · TXT</p>
      </section>

      {/* 6 Functions */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t border-gray-900">
        <h2 className="text-center text-2xl font-bold text-white mb-2">Six review functions</h2>
        <p className="text-center text-gray-500 text-sm mb-10">One manuscript. Six signal layers. Complete academic pre-review.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FUNCTIONS.map(fn => (
            <div key={fn.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-gray-600 bg-gray-800 px-2 py-0.5 rounded">{fn.id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                  ${fn.plan === 'Free' ? 'bg-emerald-950 text-emerald-400' :
                    fn.plan === 'Basic' ? 'bg-blue-950 text-blue-400' :
                    'bg-purple-950 text-purple-400'}`}>
                  {fn.plan}
                </span>
              </div>
              <p className="text-white font-semibold text-sm mb-1">{fn.label}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{fn.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-gray-900">
        <h2 className="text-center text-2xl font-bold text-white mb-10">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Upload your manuscript', desc: 'Drop a PDF, DOCX, or TXT file — or paste your text directly.' },
            { step: '02', title: 'Select a review function', desc: 'Choose from 6 functions based on what signals you need to see.' },
            { step: '03', title: 'Get your signal report', desc: 'CLASR returns a structured, signal-based academic report in seconds.' },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="w-10 h-10 bg-blue-950 border border-blue-800 rounded-xl flex items-center justify-center text-blue-400 font-mono text-sm font-bold mx-auto mb-4">{s.step}</div>
              <p className="text-white font-semibold mb-2">{s.title}</p>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center border-t border-gray-900">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to read your manuscript?</h2>
        <p className="text-gray-500 text-sm mb-8">Start with 3 free analyses. No credit card required.</p>
        <Link href="/register"
          className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors">
          Create free account
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-gray-600 text-xs">© 2025 CLASR · Academic Signal Reader</span>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <Link href="/pricing" className="hover:text-gray-400 transition-colors">Pricing</Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
