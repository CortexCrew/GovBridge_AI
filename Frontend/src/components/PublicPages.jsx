import React, { useState } from 'react';
import { ArrowRight, Bot, Building2, CheckCircle2, FileKey2, LockKeyhole, MessageSquareWarning, Search, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import indiaHero from '../assets/govbridge-india-hero.png';

const services = [
  ['AI complaint routing', 'Describe the issue once. GovBridge AI identifies the right department and priority.', MessageSquareWarning, 'Raise a complaint'],
  ['Certificate services', 'Apply for essential certificates and follow their review status in one place.', FileKey2, 'View certificates'],
  ['Digital Locker', 'Keep issued government documents available when you need them.', LockKeyhole, 'Open locker'],
];

export function LandingPage({ navigate, openAuth }) {
  return <div className="public-page">
    <section className="india-hero">
      <div className="hero-copy">
        <p className="eyebrow"><Sparkles size={15}/> Digital public infrastructure</p>
        <h1>A stronger India<br/>through smarter<br/><em>citizen services.</em></h1>
        <p className="hero-lede">Raise complaints, apply for government certificates, track your requests and access your documents — all in one place.</p>
        <div className="hero-actions"><button className="btn btn-saffron" onClick={() => openAuth('citizen_login')}>Raise a complaint <ArrowRight size={17}/></button><button className="btn btn-secondary" onClick={() => navigate('/services')}>Explore services</button></div>
        <div className="trust-row"><span><ShieldCheck size={17}/> Secure by design</span><span><Bot size={17}/> AI-assisted routing</span><span><UsersRound size={17}/> Citizen-first</span></div>
      </div>
      <div className="india-scene" aria-label="Digital India service network illustration">
        <img className="india-hero-art" src={indiaHero} alt="India Gate-inspired digital public services illustration"/>
        <div className="chakra-ring"/>
        <div className="float-card f-one"><MessageSquareWarning size={20}/><b>Complaint</b><small>AI routed</small></div>
        <div className="float-card f-two"><FileKey2 size={20}/><b>Certificate</b><small>Track status</small></div>
        <div className="float-card f-three"><LockKeyhole size={18}/><b>Secure locker</b></div>
      </div>
    </section>
    <section className="section-block"><div className="section-heading"><p className="eyebrow">Service ecosystem</p><h2>One bridge. Every essential step.</h2><p>Designed to make public services feel clear, accountable and human.</p></div><div className="service-grid">{services.map(([title, copy, Icon, action]) => <article className="service-tile" key={title}><div className="tile-icon"><Icon size={25}/></div><h3>{title}</h3><p>{copy}</p><button onClick={() => action.includes('complaint') ? openAuth('citizen_login') : navigate('/services')}>{action} <ArrowRight size={15}/></button></article>)}</div></section>
    <section className="journey"><div><p className="eyebrow">How GovBridge works</p><h2>Your request, visible at every turn.</h2><p>We connect citizens to the appropriate department — without asking you to navigate government structure yourself.</p></div><ol>{['Register securely', 'Describe your need', 'AI identifies the department', 'Track the department response'].map((x, i) => <li key={x}><b>0{i + 1}</b><span>{x}</span>{i < 3 && <i/>}</li>)}</ol></section>
    <section className="voice"><div><p className="eyebrow">Digital governance</p><h2>Your voice matters.</h2><p>Transparent request tracking and accessible digital services put citizens at the centre of public administration.</p></div><button className="btn btn-light" onClick={() => openAuth('citizen_register')}>Create your account <ArrowRight size={17}/></button></section>
  </div>;
}

export function InfoPage({ type, navigate, openAuth }) {
  const [query, setQuery] = useState('');
  const isServices = type === 'services', isHelp = type === 'help';
  const faqs = ['How do I raise a complaint?', 'How are complaints routed?', 'Which certificates can I apply for?', 'How does OTP verification work?'];
  const cards = [['Income Certificate', 'Revenue services'], ['Community Certificate', 'Social welfare services'], ['Nativity Certificate', 'Revenue services'], ['Birth Certificate', 'Public health services'], ['Residence Certificate', 'Revenue services']];
  return <div className="info-page"><header className="page-intro"><p className="eyebrow">GovBridge AI</p><h1>{isServices ? 'Services that meet you where you are.' : isHelp ? 'How can we help?' : 'Public service, made more accessible.'}</h1><p>{isServices ? 'Start a request, upload supporting documents, and keep its status within reach.' : isHelp ? 'Find clear answers to common questions about your account, complaints and certificates.' : 'GovBridge brings citizen requests, departmental workflows and AI-assisted routing into one dependable experience.'}</p></header>
  {isServices && <><div className="certificate-grid">{cards.map(([title, desc], i) => <article className="certificate-card" key={title}><span>0{i+1}</span><FileKey2 size={27}/><h3>{title}</h3><p>{desc}</p><button onClick={() => openAuth('citizen_login')}>Apply now <ArrowRight size={15}/></button></article>)}</div><article className="complaint-callout"><MessageSquareWarning size={35}/><div><h2>Need to report a civic issue?</h2><p>Tell us what happened. GovBridge AI will determine the appropriate department; it never selects an individual officer.</p></div><button className="btn btn-saffron" onClick={() => openAuth('citizen_login')}>Raise a complaint</button></article></>}
  {isHelp && <><label className="help-search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search help topics"/></label><div className="faq-list">{faqs.filter(q => q.toLowerCase().includes(query.toLowerCase())).map((q, i) => <details key={q}><summary>{q}<span>+</span></summary><p>{i === 0 ? 'Sign in, choose “Raise Complaint”, then provide a concise title and description. GovBridge AI handles the routing.' : 'Use the relevant portal action to continue. Our interface will show clear errors if a required detail is missing.'}</p></details>)}</div></>}
  {type === 'about' && <div className="about-grid"><article><Building2/><h3>Less friction</h3><p>Essential services should not require citizens to understand internal department structures.</p></article><article><Bot/><h3>Responsible AI</h3><p>AI helps categorize, prioritize and identify a department. Department workflows remain accountable.</p></article><article><CheckCircle2/><h3>Clear status</h3><p>Every request is organized into a simple, understandable citizen experience.</p></article></div>}
  <button className="text-link" onClick={() => navigate('/')}>← Back to GovBridge</button></div>;
}

export function UnauthorizedPage({ navigate }) { return <div className="empty-page"><ShieldCheck size={42}/><h1>Access restricted</h1><p>This area is available only to the appropriate signed-in portal.</p><button className="btn btn-secondary" onClick={() => navigate('/')}>Return home</button></div>; }
