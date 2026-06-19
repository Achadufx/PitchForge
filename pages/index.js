'use client';

import { useEffect, useRef, useState } from 'react';

export default function PitchWireLanding() {
  const navRef = useRef(null);
  const particlesRef = useRef(null);
  const particleInterval = useRef(null);

  // Nav scroll effect
  useEffect(() => {
    const nav = navRef.current;
    const handleScroll = () => {
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
    );
    revealEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Floating particles
  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;

    const createParticle = () => {
      const p = document.createElement('div');
      p.className = 'particle';
      const x = Math.random() * 100;
      const delay = Math.random() * 6;
      const duration = 4 + Math.random() * 6;
      const size = 1 + Math.random() * 2;
      p.style.cssText = `left:${x}%;bottom:${Math.random() * 60}%;width:${size}px;height:${size}px;animation-duration:${duration}s;animation-delay:${delay}s;`;
      container.appendChild(p);
      setTimeout(() => p.remove(), (duration + delay) * 1000);
    };

    for (let i = 0; i < 12; i++) createParticle();
    particleInterval.current = setInterval(createParticle, 400);
    return () => clearInterval(particleInterval.current);
  }, []);

  // SVG Icons
  const IconLightning = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );

  const IconDocument = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );

  const IconTarget = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  );

  const IconEdit = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );

  const IconSend = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );

  const IconChart = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );

  const IconBrain = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5v1.5h-4v-1.5c-1.2-.7-2-2-2-3.5a4 4 0 0 1 4-4z"/>
      <path d="M8 14v5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-5"/>
      <line x1="10" y1="16" x2="14" y2="16"/>
    </svg>
  );

  const IconRocket = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4l.5-2.5a22.34 22.34 0 0 1 2.5-4.5"/>
      <path d="M12 15v5l-2-1"/>
    </svg>
  );

  const IconRefresh = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  );

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --black: #070b14;
          --surface: #0c1120;
          --surface2: #111827;
          --surface3: #1a2236;
          --surface4: #1f2937;
          --border: rgba(255,255,255,0.06);
          --border2: rgba(255,255,255,0.10);
          --border3: rgba(255,255,255,0.15);
          --text: #e8eaed;
          --text2: rgba(232,234,237,0.55);
          --text3: rgba(232,234,237,0.30);
          --teal: #14b8a6;
          --teal-light: #2dd4bf;
          --teal2: #5eead4;
          --teal3: rgba(20,184,166,0.12);
          --navy: #0f172a;
          --navy-light: #1e293b;
        }

        html { scroll-behavior: smooth; }

        body {
          background: var(--black);
          color: var(--text);
          font-family: 'Inter', system-ui, sans-serif;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 999;
          opacity: 0.4;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--black); }
        ::-webkit-scrollbar-thumb { background: var(--teal); border-radius: 99px; }

        /* NAV */
        .pw-nav {
          position: fixed;
          top: 16px; left: 50%;
          transform: translateX(-50%);
          z-index: 200;
          padding: 0 20px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          background: rgba(12,17,32,0.8);
          backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid var(--border2);
          border-radius: 14px;
          width: min(calc(100% - 32px), 960px);
          transition: all 0.3s;
          flex-wrap: nowrap;
        }
        .pw-nav.scrolled {
          background: rgba(12,17,32,0.95);
          border-color: var(--border3);
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 800;
          color: var(--text);
          text-decoration: none;
          letter-spacing: -0.4px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .nav-logo .logo-icon {
          width: 28px; height: 28px;
          background: linear-gradient(135deg, var(--teal), #0d9488);
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          color: white;
          flex-shrink: 0;
        }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
          list-style: none;
          flex: 1;
          justify-content: center;
          min-width: 0;
        }
        .nav-links a {
          color: var(--text3);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: color 0.2s;
          white-space: nowrap;
        }
        .nav-links a:hover { color: var(--text); }
        .nav-right { 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          flex-shrink: 0;
        }
        .nav-login {
          color: var(--text2);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          transition: color 0.2s;
        }
        .nav-login:hover { color: var(--text); }
        .nav-cta {
          background: var(--teal);
          color: #070b14;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          text-decoration: none;
          white-space: nowrap;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
        }
        .nav-cta:hover { 
          background: var(--teal-light); 
          box-shadow: 0 4px 20px rgba(20,184,166,0.4);
          transform: translateY(-1px);
        }

        /* HERO */
        .hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 140px 24px 100px;
          overflow: hidden;
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: orbFloat 12s ease-in-out infinite alternate;
        }
        .orb-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(20,184,166,0.25) 0%, transparent 70%);
          top: -200px; left: 50%;
          transform: translateX(-50%);
          animation-duration: 10s;
          animation-name: orbFloat1;
        }
        .orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(45,212,191,0.15) 0%, transparent 70%);
          top: 20%; left: -100px;
          animation-duration: 14s;
          animation-delay: -4s;
        }
        .orb-3 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, rgba(94,234,212,0.1) 0%, transparent 70%);
          top: 30%; right: -80px;
          animation-duration: 16s;
          animation-delay: -8s;
        }
        @keyframes orbFloat {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.98); }
          100% { transform: translate(10px, -30px) scale(1.02); }
        }
        @keyframes orbFloat1 {
          0% { transform: translateX(-50%) scale(1); opacity: 0.8; }
          100% { transform: translateX(calc(-50% + 40px)) scale(1.1); opacity: 1; }
        }
        .hero-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(20,184,166,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(20,184,166,0.04) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 70% 70% at 50% 40%, black 0%, transparent 100%);
        }
        .particles { position: absolute; inset: 0; pointer-events: none; }
        .particle {
          position: absolute;
          width: 2px; height: 2px;
          background: var(--teal2);
          border-radius: 50%;
          opacity: 0;
          animation: particleRise linear infinite;
        }
        @keyframes particleRise {
          0% { opacity: 0; transform: translateY(0) scale(0); }
          10% { opacity: 0.6; }
          90% { opacity: 0.2; }
          100% { opacity: 0; transform: translateY(-120px) scale(1.5); }
        }
        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 820px;
        }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(20,184,166,0.12);
          border: 1px solid rgba(20,184,166,0.2);
          border-radius: 99px;
          padding: 7px 16px;
          font-size: 12px;
          font-weight: 600;
          color: var(--teal2);
          margin-bottom: 36px;
          letter-spacing: 0.2px;
          animation: badgeFadeIn 0.8s ease forwards;
        }
        @keyframes badgeFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--teal2);
          animation: badgePulse 2s ease-in-out infinite;
        }
        @keyframes badgePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(94,234,212,0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(94,234,212,0); }
        }
        .hero h1 {
          font-size: clamp(44px, 9vw, 96px);
          font-weight: 900;
          line-height: 0.95;
          letter-spacing: -4px;
          color: var(--text);
          margin-bottom: 28px;
          animation: h1FadeIn 0.9s ease 0.1s both;
        }
        @keyframes h1FadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero h1 em {
          font-style: normal;
          background: linear-gradient(135deg, #5eead4 0%, var(--teal) 40%, #fff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-sub {
          font-size: clamp(16px, 2.2vw, 19px);
          color: var(--text2);
          max-width: 540px;
          margin: 0 auto 52px;
          line-height: 1.65;
          font-weight: 400;
          animation: h1FadeIn 0.9s ease 0.2s both;
        }
        .hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          animation: h1FadeIn 0.9s ease 0.3s both;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--teal);
          color: #070b14;
          padding: 14px 28px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
          letter-spacing: -0.2px;
          position: relative;
          overflow: hidden;
        }
        .btn-primary::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .btn-primary:hover::before { opacity: 1; }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(20,184,166,0.4);
        }
        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          color: var(--text2);
          padding: 14px 24px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s;
          border: 1px solid var(--border2);
          cursor: pointer;
        }
        .btn-ghost:hover {
          color: var(--text);
          border-color: var(--border3);
          background: rgba(255,255,255,0.03);
        }
        .hero-stats {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-top: 72px;
          padding-top: 48px;
          border-top: 1px solid var(--border);
          animation: h1FadeIn 0.9s ease 0.4s both;
          flex-wrap: wrap;
        }
        .stat {
          text-align: center;
          padding: 0 40px;
          border-right: 1px solid var(--border);
        }
        .stat:last-child { border-right: none; }
        .stat-num {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -2px;
          color: var(--text);
          line-height: 1;
          margin-bottom: 6px;
        }
        .stat-num em {
          font-style: normal;
          background: linear-gradient(135deg, var(--teal2), #fff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .stat-label {
          font-size: 12px;
          color: var(--text3);
          font-weight: 500;
          line-height: 1.4;
        }

        /* PRODUCT PREVIEW */
        .preview-section {
          padding: 0 24px 120px;
          display: flex;
          justify-content: center;
          position: relative;
        }
        .preview-glow {
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 800px; height: 300px;
          background: radial-gradient(ellipse, rgba(20,184,166,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .preview-window {
          width: 100%;
          max-width: 960px;
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: 20px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.04),
            0 40px 100px rgba(0,0,0,0.9),
            0 0 80px rgba(20,184,166,0.08);
          position: relative;
          z-index: 1;
        }
        .preview-titlebar {
          background: var(--surface3);
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border);
        }
        .traffic-lights { display: flex; gap: 6px; }
        .tl { width: 11px; height: 11px; border-radius: 50%; }
        .tl-r { background: #ff5f57; }
        .tl-y { background: #febc2e; }
        .tl-g { background: #28c840; }
        .preview-url {
          flex: 1;
          background: var(--surface4);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 5px 12px;
          font-size: 12px;
          color: var(--text3);
          max-width: 300px;
        }
        .preview-body {
          display: grid;
          grid-template-columns: 260px 1fr;
          min-height: 340px;
        }
        .preview-sidebar {
          background: var(--surface3);
          border-right: 1px solid var(--border);
          padding: 20px 0;
        }
        .sidebar-section-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 0 16px;
          margin-bottom: 8px;
        }
        .sidebar-investor {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          cursor: pointer;
          transition: background 0.15s;
          border-left: 2px solid transparent;
        }
        .sidebar-investor.active {
          background: rgba(20,184,166,0.1);
          border-left-color: var(--teal);
        }
        .sidebar-investor:hover:not(.active) { background: rgba(255,255,255,0.03); }
        .investor-av {
          width: 30px; height: 30px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; color: white; flex-shrink: 0;
        }
        .investor-av-1 { background: linear-gradient(135deg, #14b8a6, #0d9488); }
        .investor-av-2 { background: linear-gradient(135deg, #0ea5e9, #2563eb); }
        .investor-av-3 { background: linear-gradient(135deg, #10b981, #059669); }
        .investor-av-4 { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .investor-info { flex: 1; min-width: 0; }
        .investor-name { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .investor-firm { font-size: 10px; color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .score-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 99px;
          flex-shrink: 0;
        }
        .score-high { background: rgba(45,212,191,0.12); color: #2dd4bf; }
        .score-med { background: rgba(251,191,36,0.12); color: #fbbf24; }
        .preview-main { padding: 24px; }
        .pm-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .pm-subject {
          font-size: 14px;
          font-weight: 700;
          color: var(--teal2);
          margin-bottom: 12px;
          line-height: 1.4;
        }
        .pm-body {
          font-size: 13px;
          color: var(--text2);
          line-height: 1.7;
          margin-bottom: 20px;
        }
        .pm-body strong { color: var(--text); font-weight: 600; }
        .pm-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .pm-btn {
          padding: 8px 16px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .pm-btn-send { background: var(--teal); color: #070b14; }
        .pm-btn-send:hover { background: var(--teal-light); }
        .pm-btn-regen { 
          background: var(--surface4); 
          color: var(--text2); 
          border: 1px solid var(--border2) !important; 
        }
        .pm-btn-regen:hover { color: var(--text); }

        /* ORIGIN */
        .origin-section {
          padding: 60px 24px;
          text-align: center;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          position: relative;
          overflow: hidden;
        }
        .origin-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 50% 100% at 50% 50%, rgba(20,184,166,0.04) 0%, transparent 70%);
          pointer-events: none;
        }
        .origin-eyebrow {
          font-size: 11px;
          font-weight: 700;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 20px;
        }
        .origin-text {
          max-width: 680px;
          margin: 0 auto;
          font-size: 17px;
          color: var(--text2);
          line-height: 1.8;
          font-weight: 400;
        }
        .origin-text strong { color: var(--text); font-weight: 600; }

        /* FEATURES */
        .features-section {
          padding: 140px 24px;
          max-width: 1120px;
          margin: 0 auto;
        }
        .section-header { margin-bottom: 72px; }
        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: var(--teal2);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 20px;
        }
        .eyebrow::before {
          content: '';
          width: 16px; height: 1px;
          background: var(--teal2);
        }
        .section-title {
          font-size: clamp(32px, 5vw, 54px);
          font-weight: 900;
          letter-spacing: -2.5px;
          line-height: 1.05;
          color: var(--text);
          margin-bottom: 20px;
        }
        .section-title em {
          font-style: normal;
          color: var(--text3);
        }
        .section-sub {
          font-size: 17px;
          color: var(--text2);
          max-width: 500px;
          line-height: 1.65;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
        }
        .feature-card {
          background: var(--surface);
          padding: 36px 32px;
          transition: background 0.25s;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(20,184,166,0.3), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .feature-card:hover { background: var(--surface2); }
        .feature-card:hover::before { opacity: 1; }
        .feature-icon {
          width: 42px; height: 42px;
          border-radius: 10px;
          background: rgba(20,184,166,0.1);
          border: 1px solid rgba(20,184,166,0.12);
          display: flex; align-items: center; justify-content: center;
          color: var(--teal2);
          margin-bottom: 20px;
          transition: all 0.25s;
        }
        .feature-card:hover .feature-icon {
          background: rgba(20,184,166,0.18);
          border-color: rgba(20,184,166,0.25);
          transform: scale(1.05);
        }
        .feature-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 10px;
          letter-spacing: -0.3px;
          line-height: 1.3;
        }
        .feature-desc {
          font-size: 13.5px;
          color: var(--text2);
          line-height: 1.65;
        }

        /* HOW IT WORKS */
        .how-section {
          padding: 140px 24px;
          position: relative;
          overflow: hidden;
        }
        .how-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 60% at 0% 50%, rgba(20,184,166,0.04) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 100% 50%, rgba(45,212,191,0.03) 0%, transparent 60%);
          pointer-events: none;
        }
        .how-inner {
          max-width: 860px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .steps {
          margin-top: 72px;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .steps::before {
          content: '';
          position: absolute;
          left: 21px;
          top: 0; bottom: 0;
          width: 1px;
          background: linear-gradient(to bottom, transparent, var(--border2) 10%, var(--border2) 90%, transparent);
        }
        .step {
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 28px;
          padding: 40px 0;
          border-bottom: 1px solid var(--border);
          align-items: start;
          position: relative;
        }
        .step:last-child { border-bottom: none; }
        .step-num {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: var(--surface3);
          border: 1px solid var(--border2);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px;
          font-weight: 800;
          color: var(--teal2);
          flex-shrink: 0;
          position: relative;
          z-index: 1;
          transition: all 0.3s;
        }
        .step:hover .step-num {
          background: rgba(20,184,166,0.12);
          border-color: rgba(20,184,166,0.25);
        }
        .step-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--text);
          margin-bottom: 10px;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }
        .step-desc {
          font-size: 15px;
          color: var(--text2);
          line-height: 1.7;
          margin-bottom: 14px;
        }
        .step-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(20,184,166,0.08);
          border: 1px solid rgba(20,184,166,0.12);
          border-radius: 99px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          color: var(--teal2);
        }

        /* COMPARISON */
        .comparison-section {
          padding: 140px 24px;
          max-width: 1120px;
          margin: 0 auto;
        }
        .comparison-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 72px;
          align-items: start;
        }
        .comp-card {
          border-radius: 16px;
          padding: 28px;
          border: 1px solid var(--border);
        }
        .comp-bad { background: var(--surface2); opacity: 0.65; }
        .comp-good {
          background: var(--surface2);
          border-color: rgba(20,184,166,0.25);
          box-shadow: 0 0 60px rgba(20,184,166,0.06), inset 0 1px 0 rgba(20,184,166,0.12);
        }
        .comp-tag {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 4px 10px;
          border-radius: 99px;
          margin-bottom: 20px;
        }
        .comp-tag-bad { background: rgba(248,113,113,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.2); }
        .comp-tag-good { background: rgba(45,212,191,0.1); color: #2dd4bf; border: 1px solid rgba(45,212,191,0.2); }
        .comp-subject {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 14px;
          line-height: 1.4;
        }
        .comp-body {
          font-size: 13px;
          color: var(--text2);
          line-height: 1.75;
        }
        .comp-body strong { color: var(--text); font-weight: 600; }

        /* FOUNDER STORY */
        .story-section {
          padding: 140px 24px;
          position: relative;
          overflow: hidden;
        }
        .story-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 60% 80% at 50% 50%, rgba(20,184,166,0.04) 0%, transparent 70%);
          pointer-events: none;
        }
        .story-inner {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
          position: relative;
          z-index: 1;
        }
        .story-card {
          background: var(--surface2);
          border: 1px solid rgba(20,184,166,0.15);
          border-radius: 20px;
          padding: 52px 48px;
          margin-top: 52px;
          text-align: left;
          position: relative;
          overflow: hidden;
          box-shadow: 0 0 80px rgba(20,184,166,0.04);
        }
        .story-card::before {
          content: '"';
          position: absolute;
          top: -20px; left: 40px;
          font-size: 200px;
          font-weight: 900;
          color: rgba(20,184,166,0.06);
          line-height: 1;
          font-family: Georgia, serif;
          pointer-events: none;
        }
        .story-text {
          font-size: 18px;
          color: rgba(255,255,255,0.8);
          line-height: 1.85;
          margin-bottom: 40px;
          position: relative;
          z-index: 1;
        }
        .story-text strong { color: var(--text); font-weight: 700; }
        .story-author {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-top: 32px;
          border-top: 1px solid var(--border);
          position: relative;
          z-index: 1;
        }
        .story-avatar {
          width: 52px; height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--teal), #0d9488);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 900; color: white;
          flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(20,184,166,0.2);
        }
        .story-author-name { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
        .story-author-role { font-size: 13px; color: var(--text3); line-height: 1.4; }

        /* PRICING */
        .pricing-section {
          padding: 140px 24px;
          background: var(--surface);
          border-top: 1px solid var(--border);
          position: relative;
          overflow: hidden;
        }
        .pricing-section::before {
          content: '';
          position: absolute;
          top: 0; left: 50%; transform: translateX(-50%);
          width: 600px; height: 300px;
          background: radial-gradient(ellipse, rgba(20,184,166,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .pricing-inner { max-width: 960px; margin: 0 auto; position: relative; z-index: 1; }
        .pricing-header { text-align: center; margin-bottom: 72px; }
        .pricing-header .section-sub { margin: 16px auto 0; text-align: center; }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
        }
        .pricing-card {
          background: var(--surface);
          padding: 40px 32px;
          position: relative;
          transition: background 0.2s;
        }
        .pricing-card.hot { background: var(--surface2); }
        .pricing-card.hot::after {
          content: 'Most Popular';
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          background: var(--teal);
          color: #070b14;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 14px;
          border-radius: 0 0 10px 10px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .price-tier {
          font-size: 11px;
          font-weight: 700;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 20px;
        }
        .price-amount {
          font-size: 44px;
          font-weight: 900;
          letter-spacing: -3px;
          color: var(--text);
          line-height: 1;
          margin-bottom: 6px;
        }
        .price-amount sup {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0;
          vertical-align: super;
        }
        .price-amount sub {
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0;
          color: var(--text3);
          vertical-align: baseline;
        }
        .price-desc {
          font-size: 13px;
          color: var(--text3);
          margin-bottom: 32px;
          line-height: 1.5;
        }
        .price-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 11px;
          margin-bottom: 36px;
        }
        .price-features li {
          font-size: 13px;
          color: var(--text2);
          display: flex;
          align-items: flex-start;
          gap: 9px;
          line-height: 1.4;
        }
        .price-check {
          color: var(--teal2);
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .price-btn {
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          letter-spacing: -0.2px;
          display: inline-block;
          text-align: center;
        }
        .price-btn-outline {
          background: transparent;
          color: var(--text2);
          border: 1px solid var(--border2) !important;
        }
        .price-btn-outline:hover { background: rgba(255,255,255,0.04); color: var(--text); border-color: var(--border3) !important; }
        .price-btn-solid { 
          background: var(--teal); 
          color: #070b14; 
        }
        .price-btn-solid:hover { 
          background: var(--teal-light); 
          box-shadow: 0 8px 24px rgba(20,184,166,0.35); 
        }

        /* FINAL CTA */
        .cta-section {
          padding: 160px 24px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .cta-orb {
          position: absolute;
          width: 800px; height: 400px;
          bottom: -100px; left: 50%;
          transform: translateX(-50%);
          background: radial-gradient(ellipse, rgba(20,184,166,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-inner {
          position: relative;
          z-index: 1;
          max-width: 620px;
          margin: 0 auto;
        }
        .cta-title {
          font-size: clamp(36px, 6vw, 64px);
          font-weight: 900;
          letter-spacing: -3px;
          line-height: 1.0;
          margin-bottom: 20px;
          color: var(--text);
        }
        .cta-title em {
          font-style: normal;
          background: linear-gradient(135deg, var(--teal2), #fff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .cta-sub {
          font-size: 17px;
          color: var(--text2);
          margin-bottom: 44px;
          line-height: 1.65;
        }
        .cta-note {
          margin-top: 20px;
          font-size: 12px;
          color: var(--text3);
        }

        /* FOOTER */
        .pw-footer {
          border-top: 1px solid var(--border);
          padding: 40px 24px;
        }
        .footer-inner {
          max-width: 1120px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .footer-logo {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 15px;
          font-weight: 800;
          color: var(--text2);
          text-decoration: none;
          letter-spacing: -0.3px;
        }
        .footer-links {
          display: flex;
          gap: 24px;
          list-style: none;
          flex-wrap: wrap;
        }
        .footer-links a {
          color: var(--text3);
          text-decoration: none;
          font-size: 13px;
          transition: color 0.2s;
        }
        .footer-links a:hover { color: var(--text2); }
        .footer-copy { font-size: 12px; color: var(--text3); }

        /* SCROLL ANIMATIONS */
        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        .reveal-delay-1 { transition-delay: 0.1s; }
        .reveal-delay-2 { transition-delay: 0.2s; }
        .reveal-delay-3 { transition-delay: 0.3s; }
        .reveal-delay-4 { transition-delay: 0.4s; }
        .reveal-left {
          opacity: 0;
          transform: translateX(-24px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .reveal-left.visible { opacity: 1; transform: translateX(0); }
        .reveal-right {
          opacity: 0;
          transform: translateX(24px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .reveal-right.visible { opacity: 1; transform: translateX(0); }

        /* RESPONSIVE */
        @media (max-width: 960px) {
          .features-grid { grid-template-columns: 1fr 1fr; }
          .pricing-grid { grid-template-columns: 1fr; max-width: 400px; margin: 0 auto; }
          .comparison-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .pw-nav { 
            gap: 16px;
            padding: 0 16px;
          }
          .nav-links { 
            gap: 16px;
          }
          .nav-links a {
            font-size: 12px;
          }
          .preview-body { grid-template-columns: 1fr; }
          .preview-sidebar { display: none; }
          .hero-stats { 
            gap: 20px;
            flex-direction: column;
          }
          .stat { 
            padding: 0; 
            border-right: none;
          }
          .stat:not(:last-child) {
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
          }
          .story-card { padding: 32px 24px; }
          .step {
            grid-template-columns: 36px 1fr;
            gap: 20px;
          }
          .step-num {
            width: 36px;
            height: 36px;
          }
        }
        @media (max-width: 640px) {
          .pw-nav { 
            top: 8px;
            height: auto;
            padding: 12px 16px;
          }
          .nav-links { display: none; }
          .nav-logo { font-size: 15px; }
          .nav-cta { padding: 6px 12px; font-size: 12px; }
          .nav-login { font-size: 12px; }
          .features-grid { grid-template-columns: 1fr; }
          .hero { padding: 120px 16px 60px; }
          .hero h1 { letter-spacing: -2px; }
          .hero-stats .stat:last-child { display: none; }
          .hero-actions { flex-direction: column; width: 100%; }
          .hero-actions .btn-primary,
          .hero-actions .btn-ghost { width: 100%; justify-content: center; }
          .pw-footer .footer-links { display: none; }
          .footer-inner { 
            flex-direction: column; 
            align-items: flex-start;
            text-align: left;
          }
          .comparison-grid { gap: 16px; }
          .comp-card { padding: 20px; }
          .preview-section { padding: 0 16px 80px; }
          .features-section,
          .how-section,
          .comparison-section,
          .story-section,
          .pricing-section { padding: 80px 16px; }
          .section-title { letter-spacing: -1.5px; }
          .story-text { font-size: 16px; }
        }

        @media (max-width: 480px) {
          .hero h1 { font-size: 36px; }
          .hero-sub { font-size: 15px; }
          .btn-primary,
          .btn-ghost { padding: 12px 20px; font-size: 14px; }
          .pricing-grid { gap: 1px; }
          .pricing-card { padding: 28px 20px; }
          .cta-section { padding: 100px 16px; }
          .cta-title { font-size: 32px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .orb, .particle, .hero-badge, .hero h1, .hero-sub, .hero-actions, .hero-stats { animation: none; }
          .reveal, .reveal-left, .reveal-right { opacity: 1; transform: none; transition: none; }
        }
      `}</style>

      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav className="pw-nav" ref={navRef}>
        <a href="#" className="nav-logo">
          <div className="logo-icon">
            <IconLightning />
          </div>
          PitchWire
        </a>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#pricing">Pricing</a></li>
        </ul>
        <div className="nav-right">
          <a href="/login" className="nav-login">Sign in</a>
          <a href="/app" className="nav-cta">Start free →</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="hero-grid"></div>
        <div className="particles" ref={particlesRef}></div>
        <div className="hero-content">
          <div className="hero-badge">
            <div className="badge-dot"></div>
            AI-Powered Fundraising Copilot
          </div>
          <h1>Your unfair<br /><em>advantage</em><br />in the room.</h1>
          <p className="hero-sub">Upload your pitch deck. Discover investors who actually fit. Send personalized pitches that don't sound like templates — in minutes, not weeks.</p>
          <div className="hero-actions">
            <a href="/app" className="btn-primary">
              <IconSend />
              Start for free — no card needed →
            </a>
            <a href="#how" className="btn-ghost">See how it works</a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-num"><em>10x</em></div>
              <div className="stat-label">Faster than<br />manual outreach</div>
            </div>
            <div className="stat">
              <div className="stat-num"><em>100+</em></div>
              <div className="stat-label">Investors reached<br />per campaign</div>
            </div>
            <div className="stat">
              <div className="stat-num"><em>Free</em></div>
              <div className="stat-label">To start — 10<br />pitches on us</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT PREVIEW */}
      <section className="preview-section">
        <div className="preview-glow"></div>
        <div className="preview-window reveal">
          <div className="preview-titlebar">
            <div className="traffic-lights">
              <div className="tl tl-r"></div>
              <div className="tl tl-y"></div>
              <div className="tl tl-g"></div>
            </div>
            <div className="preview-url">pitchwire.app/campaign</div>
          </div>
          <div className="preview-body">
            <div className="preview-sidebar">
              <div className="sidebar-section-label" style={{ marginTop: '4px' }}>Matched Investors</div>
              <div className="sidebar-investor active">
                <div className="investor-av investor-av-1">AS</div>
                <div className="investor-info">
                  <div className="investor-name">Anya Singh</div>
                  <div className="investor-firm">Sequoia Capital</div>
                </div>
                <div className="score-badge score-high">96%</div>
              </div>
              <div className="sidebar-investor">
                <div className="investor-av investor-av-2">MK</div>
                <div className="investor-info">
                  <div className="investor-name">Marcus Klein</div>
                  <div className="investor-firm">a16z Bio</div>
                </div>
                <div className="score-badge score-high">91%</div>
              </div>
              <div className="sidebar-investor">
                <div className="investor-av investor-av-3">TO</div>
                <div className="investor-info">
                  <div className="investor-name">Tolu Okafor</div>
                  <div className="investor-firm">Partech Africa</div>
                </div>
                <div className="score-badge score-high">88%</div>
              </div>
              <div className="sidebar-investor">
                <div className="investor-av investor-av-4">RB</div>
                <div className="investor-info">
                  <div className="investor-name">Rachel Bao</div>
                  <div className="investor-firm">GV</div>
                </div>
                <div className="score-badge score-med">79%</div>
              </div>
            </div>
            <div className="preview-main">
              <div className="pm-label">Generated Pitch — Anya Singh · Sequoia Capital</div>
              <div className="pm-subject">HIPAA exists. Patients still don't own their data.</div>
              <div className="pm-body">
                <strong>Sequoia's bet on health data portability in the US is well documented.</strong> The same crisis is 10x worse in markets where patients have no rights at all — and nobody has built the infrastructure layer to fix it.<br /><br />
                A patient in Accra carries her child's entire medical history in her head because no hospital will share the file. A man in Jakarta gets the wrong diagnosis because his scans are locked in a clinic he can't afford to revisit. This isn't an edge case — it's the default experience for billions of people.<br /><br />
                We built the infrastructure that changes that. Patients get a secured vault for their records. Doctors request access. Patients approve from their phone. Every event is logged and tamper-proof — the same guarantees HIPAA demands, built for markets that have none of those protections yet.<br /><br />
                <strong>Working MVP. Live doctor and patient portals. 15 minutes this week?</strong>
              </div>
              <div className="pm-actions">
                <button className="pm-btn pm-btn-send">
                  <IconSend />
                  Send Pitch
                </button>
                <button className="pm-btn pm-btn-regen">
                  <IconRefresh />
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ORIGIN */}
      <section className="origin-section">
        <div className="origin-eyebrow">Why PitchWire exists</div>
        <p className="origin-text reveal">
          I'm a medical student and co-founder of <strong>ForcepX</strong> — a platform that gives patients secure, verifiable ownership of their own medical records, starting in Africa and expanding globally. When it came time to raise, I spent weeks researching investors, writing emails one by one, and hearing nothing back. So I built the tool I wished existed. Then I realized <strong>every founder has the same problem.</strong>
        </p>
      </section>

      {/* FEATURES */}
      <section className="features-section" id="features">
        <div className="section-header reveal">
          <div className="eyebrow">Everything you need</div>
          <div className="section-title">A complete fundraising<br /><em>operating system.</em></div>
          <p className="section-sub">From discovering the right investors to sending campaigns and tracking every reply — all in one place.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card reveal reveal-delay-1">
            <div className="feature-icon"><IconDocument /></div>
            <div className="feature-title">Upload everything you have</div>
            <div className="feature-desc">Pitch deck, executive summary, financials, one-pager — drop it all in. The AI reads every document and builds a deep understanding of your startup before writing a single word.</div>
          </div>
          <div className="feature-card reveal reveal-delay-2">
            <div className="feature-icon"><IconTarget /></div>
            <div className="feature-title">Find investors that actually fit</div>
            <div className="feature-desc">Filter by stage, sector, geography, and check size. Every investor gets scored for fit, activity, and accessibility — so you know who to target first and who to skip.</div>
          </div>
          <div className="feature-card reveal reveal-delay-3">
            <div className="feature-icon"><IconEdit /></div>
            <div className="feature-title">Pitches that don't sound like pitches</div>
            <div className="feature-desc">The AI reads each investor's portfolio, thesis, and recent bets — then writes an email that references what they actually care about. Not a template with a name swapped in.</div>
          </div>
          <div className="feature-card reveal reveal-delay-1">
            <div className="feature-icon"><IconSend /></div>
            <div className="feature-title">Send to 100 investors in one click</div>
            <div className="feature-desc">Review, edit, or regenerate any pitch before it goes out. Then send the whole campaign and watch the replies come in — without ever opening your email client.</div>
          </div>
          <div className="feature-card reveal reveal-delay-2">
            <div className="feature-icon"><IconChart /></div>
            <div className="feature-title">Track every conversation</div>
            <div className="feature-desc">See who opened, who replied, who went cold. Move investors through your pipeline from Contacted to Meeting Scheduled to Term Sheet — all in one clean dashboard.</div>
          </div>
          <div className="feature-card reveal reveal-delay-3">
            <div className="feature-icon"><IconBrain /></div>
            <div className="feature-title">AI follow-up suggestions</div>
            <div className="feature-desc">Investor opened but didn't reply? Got a positive response? The AI drafts your next move instantly — follow-ups, meeting confirmations, additional info requests.</div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section" id="how">
        <div className="how-inner">
          <div className="section-header reveal">
            <div className="eyebrow">The process</div>
            <div className="section-title">From deck to inbox<br /><em>in under 10 minutes.</em></div>
          </div>
          <div className="steps">
            <div className="step reveal">
              <div className="step-num">01</div>
              <div className="step-body">
                <div className="step-title">Upload your startup documents</div>
                <div className="step-desc">Drop in your pitch deck, executive summary, financials — anything that describes your startup. The AI reads everything and builds a complete picture of your company, market, traction, and vision.</div>
                <div className="step-pill"><IconDocument /> PDF, DOCX, URLs accepted</div>
              </div>
            </div>
            <div className="step reveal">
              <div className="step-num">02</div>
              <div className="step-body">
                <div className="step-title">Discover and score investors</div>
                <div className="step-desc">Browse thousands of investors filtered by sector, stage, geography, and check size. Each gets a Fit Score, Activity Score, and Accessibility Score — so you know exactly who to prioritize.</div>
                <div className="step-pill"><IconTarget /> Three-dimensional investor scoring</div>
              </div>
            </div>
            <div className="step reveal">
              <div className="step-num">03</div>
              <div className="step-body">
                <div className="step-title">Generate hyper-personalized pitches</div>
                <div className="step-desc">The AI researches each investor's portfolio, thesis, recent investments, and public statements. Then writes an email that speaks to what they care about. Review, edit, or regenerate any pitch before it goes out.</div>
                <div className="step-pill"><IconEdit /> Powered by Claude AI</div>
              </div>
            </div>
            <div className="step reveal">
              <div className="step-num">04</div>
              <div className="step-body">
                <div className="step-title">Send, track, and follow up</div>
                <div className="step-desc">Launch your campaign in one click. Track opens, replies, and meetings in real time. The AI suggests follow-ups and helps you manage every conversation — so nothing falls through the cracks.</div>
                <div className="step-pill"><IconChart /> Full CRM pipeline included</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="comparison-section">
        <div className="section-header reveal">
          <div className="eyebrow">The difference</div>
          <div className="section-title">Generic template<br /><em>vs. PitchWire.</em></div>
          <p className="section-sub">See what happens when AI actually reads your deck and the investor's portfolio — instead of filling in a blank.</p>
        </div>
        <div className="comparison-grid">
          <div className="comp-card comp-bad reveal reveal-left">
            <div className="comp-tag comp-tag-bad">❌ Generic cold email</div>
            <div className="comp-subject">Exciting investment opportunity</div>
            <div className="comp-body">Hi [Investor Name], I hope this email finds you well. I am reaching out because I believe our revolutionary startup would be a great fit for your portfolio. We are disrupting the healthcare industry with our game-changing solution. I would love to schedule a call at your earliest convenience to discuss further...</div>
          </div>
          <div className="comp-card comp-good reveal reveal-right">
            <div className="comp-tag comp-tag-good">✓ PitchWire pitch</div>
            <div className="comp-subject">HIPAA exists. Patients still don't own their data.</div>
            <div className="comp-body">
              <strong>Sequoia's bet on health data portability is well documented.</strong> The same crisis is 10x worse in markets where patients have no rights at all — and nobody has built the infrastructure layer.<br /><br />
              A patient in Accra carries her child's entire medical history in her head because no hospital will share the file. This isn't a developing world problem. It's a global infrastructure failure.<br /><br />
              We built the fix. Working MVP. Live portals. <strong>15 minutes this week?</strong>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER STORY */}
      <section className="story-section">
        <div className="story-inner">
          <div className="reveal">
            <div className="eyebrow" style={{ justifyContent: 'center' }}>The origin</div>
            <div className="section-title" style={{ textAlign: 'center' }}>Built by a founder,<br /><em>for founders.</em></div>
          </div>
          <div className="story-card reveal">
            <div className="story-text">
              "I'm a medical student and the CTO of <strong>ForcepX</strong> — a platform that gives patients secure, verifiable control over their own medical records. No hospital, insurer, or third party can access or share their data without explicit, real-time consent. We're building the infrastructure that makes true patient ownership possible — every access request logged in a permanent, tamper-proof audit trail, so patients always know who saw their records, when, and why. Starting in Africa, expanding globally, because this problem exists everywhere.<br /><br />
              When we started fundraising, I did what every founder does: spent hours on Crunchbase, wrote personalised emails one by one, second-guessed every subject line, and heard nothing back.<br /><br />
              So I built the tool I wished existed. PitchWire reads your deck, finds the right investors, and writes pitches that sound like you spent two hours researching each person. Because it did.<br /><br />
              If you're raising right now — <strong>this is the tool I wish I had.</strong>"
            </div>
            <div className="story-author">
              <div className="story-avatar">S</div>
              <div>
                <div className="story-author-name">Samuel</div>
                <div className="story-author-role">Co-founder &amp; CTO, ForcepX<br />Creator of PitchWire</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section" id="pricing">
        <div className="pricing-inner">
          <div className="pricing-header reveal">
            <div className="eyebrow" style={{ justifyContent: 'center' }}>Pricing</div>
            <div className="section-title" style={{ textAlign: 'center' }}>Start free.<br /><em>Scale when it works.</em></div>
            <p className="section-sub">One good investor meeting pays for this a thousand times over.</p>
          </div>
          <div className="pricing-grid reveal">
            <div className="pricing-card">
              <div className="price-tier">Free</div>
              <div className="price-amount">$0</div>
              <div className="price-desc">10 pitches to test the waters</div>
              <ul className="price-features">
                <li><span className="price-check">✓</span> 10 pitches total</li>
                <li><span className="price-check">✓</span> Investor discovery</li>
                <li><span className="price-check">✓</span> AI pitch generation</li>
                <li><span className="price-check">✓</span> CSV upload</li>
                <li><span className="price-check">✓</span> PitchWire watermark</li>
              </ul>
              <a href="/login" className="price-btn price-btn-outline">Get started free</a>
            </div>
            <div className="pricing-card hot">
              <div className="price-tier">Starter</div>
              <div className="price-amount"><sup>$</sup>19<sub>/mo</sub></div>
              <div className="price-desc">100 pitches per month</div>
              <ul className="price-features">
                <li><span className="price-check">✓</span> 100 pitches per month</li>
                <li><span className="price-check">✓</span> Document upload</li>
                <li><span className="price-check">✓</span> No watermark</li>
                <li><span className="price-check">✓</span> Investor fit scoring</li>
                <li><span className="price-check">✓</span> Campaign tracking</li>
              </ul>
              <a href="/login" className="price-btn price-btn-solid">Get Starter →</a>
            </div>
            <div className="pricing-card">
              <div className="price-tier">Pro</div>
              <div className="price-amount"><sup>$</sup>49<sub>/mo</sub></div>
              <div className="price-desc">Unlimited — for serious rounds</div>
              <ul className="price-features">
                <li><span className="price-check">✓</span> Unlimited pitches</li>
                <li><span className="price-check">✓</span> Full document upload</li>
                <li><span className="price-check">✓</span> Full CRM pipeline</li>
                <li><span className="price-check">✓</span> AI follow-up suggestions</li>
                <li><span className="price-check">✓</span> Open &amp; reply tracking</li>
                <li><span className="price-check">✓</span> Priority support</li>
              </ul>
              <a href="/login" className="price-btn price-btn-outline">Get Pro →</a>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-section">
        <div className="cta-orb"></div>
        <div className="cta-inner reveal">
          <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: '24px' }}>Get started today</div>
          <div className="cta-title">Stop writing cold<br />emails <em>manually.</em></div>
          <p className="cta-sub">10 free pitches. No credit card. No setup.<br />Upload your deck and send your first campaign in minutes.</p>
          <a href="/app" className="btn-primary" style={{ fontSize: '16px', padding: '16px 36px' }}>
            <IconRocket />
            Start for free — takes 2 minutes →
          </a>
          <p className="cta-note">No credit card required · Cancel anytime · Built for founders</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pw-footer">
        <div className="footer-inner">
          <a href="/" className="footer-logo">
            <IconLightning />
            PitchWire
          </a>
          <ul className="footer-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how">How it works</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#">Privacy</a></li>
            <li><a href="#">Terms</a></li>
          </ul>
          <div className="footer-copy">© 2026 PitchWire. Built for founders.</div>
        </div>
      </footer>
    </>
  );
}
