'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7F8] font-sans selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 py-3' : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform overflow-hidden">
                <img src="/logo_v3.png" alt="AyaTech Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">AyaTech</span>
                <span className="text-[10px] md:text-xs text-primary font-bold tracking-widest uppercase">Global Academy</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-10">
              <Link href="#features" className="text-[15px] font-medium text-gray-600 hover:text-primary transition-colors">Features</Link>
              <Link href="#courses" className="text-[15px] font-medium text-gray-600 hover:text-primary transition-colors">Courses</Link>
              <Link href="#about" className="text-[15px] font-medium text-gray-600 hover:text-primary transition-colors">About</Link>
              <Link
                href="/apply"
                className="px-6 py-2.5 text-[15px] font-bold text-white bg-primary rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-dark hover:-translate-y-0.5 transition-all"
              >
                JOIN AYATECH
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-xl p-6 animate-slide-down">
            <div className="flex flex-col gap-5">
              <Link href="#features" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-gray-600">Features</Link>
              <Link href="#courses" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-gray-600">Courses</Link>
              <Link href="#about" onClick={() => setIsMenuOpen(false)} className="text-base font-medium text-gray-600">About</Link>
              <Link
                href="/apply"
                onClick={() => setIsMenuOpen(false)}
                className="px-6 py-3 text-center text-base font-bold text-white bg-primary rounded-lg"
              >
                JOIN AYATECH
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-48 pb-20 md:pb-32 px-6 lg:px-8 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -mr-64 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[80px] -ml-32 -mb-32"></div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Live Indicator */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-xs md:text-sm font-bold text-primary tracking-wide uppercase">Admissions Open for 2026</span>
            </div>

            <h1 className="text-4xl md:text-7xl font-extrabold text-gray-900 mb-8 leading-[1.1] tracking-tight animate-slide-up">
              Empower the next generation of <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">innovators</span>.
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mb-12 leading-relaxed max-w-2xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Live courses in AI, coding, design, and hardware. IGCSE school. Tinkering labs. From Calicut, Kerala, to the world. Join 3,700+ learners today.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Link
                href="/apply"
                className="px-10 py-4 md:py-5 bg-primary text-white text-lg font-bold rounded-xl shadow-xl shadow-primary/30 hover:bg-primary-dark hover:-translate-y-1 transition-all text-center"
              >
                JOIN AYATECH
              </Link>
              <Link
                href="#about"
                className="px-10 py-4 md:py-5 bg-white border-2 border-gray-100 text-gray-900 text-lg font-bold rounded-xl hover:border-primary hover:text-primary transition-all text-center"
              >
                See Our Campus
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 md:py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
            <div className="text-center group">
              <div className="text-4xl md:text-6xl font-bold text-primary mb-3 group-hover:scale-110 transition-transform">3.7k+</div>
              <div className="text-sm font-bold text-gray-400 tracking-widest uppercase">Learners Global</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl md:text-6xl font-bold text-primary mb-3 group-hover:scale-110 transition-transform">15+</div>
              <div className="text-sm font-bold text-gray-400 tracking-widest uppercase">Expert Programs</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl md:text-6xl font-bold text-primary mb-3 group-hover:scale-110 transition-transform">30+</div>
              <div className="text-sm font-bold text-gray-400 tracking-widest uppercase">Countries Reached</div>
            </div>
            <div className="text-center group">
              <div className="text-4xl md:text-6xl font-bold text-primary mb-3 group-hover:scale-110 transition-transform">₹999</div>
              <div className="text-sm font-bold text-gray-400 tracking-widest uppercase">Starts At Only</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A202C] py-20 px-6 lg:px-8 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                  <img src="/logo_v3.png" alt="AyaTech Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <span className="text-xl font-bold tracking-tight">AyaTech</span>
              </div>
              <p className="text-gray-400 leading-relaxed max-w-xs">
                Empowering the next generation of innovators through live courses and world-class technical mentorship.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold tracking-widest uppercase text-white/50 mb-6">Programs</h4>
              <ul className="space-y-4 text-gray-400">
                <li><Link href="/" className="hover:text-primary transition-colors">Online Courses</Link></li>
                <li><Link href="/" className="hover:text-primary transition-colors">IGCSE Online School</Link></li>
                <li><Link href="/" className="hover:text-primary transition-colors">Tinkering Labs</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold tracking-widest uppercase text-white/50 mb-6">Company</h4>
              <ul className="space-y-4 text-gray-400">
                <li><Link href="/" className="hover:text-primary transition-colors">About AyaTech</Link></li>
                <li><Link href="/" className="hover:text-primary transition-colors">Contact Us</Link></li>
                <li><Link href="/" className="hover:text-primary transition-colors">Careers</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold tracking-widest uppercase text-white/50 mb-6">Contact</h4>
              <p className="text-gray-400 mb-4 line-clamp-2">Door No. 63/2243-L, Kozhikode, Kerala, India - 673032</p>
              <Link href="tel:9037665777" className="text-primary font-bold hover:underline">9037665777</Link>
            </div>
          </div>
          
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-gray-500 font-medium">
            <p>© 2026 AyaTech. All rights reserved.</p>
            <div className="flex gap-10">
              <Link href="/" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/" className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
