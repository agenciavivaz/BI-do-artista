import type { ReactNode } from 'react';

const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
const wrap = (children: ReactNode) => <svg {...base}>{children}</svg>;

export const IcInicio = () => wrap(<><path d="M4 11 12 4l8 7" /><path d="M6 10v9h12v-9" /></>);
export const IcPerguntar = () => wrap(<><path d="M5 5h14v10H10l-5 4z" /><path d="M9 9.5h6" /></>);
export const IcSimular = () => wrap(<><path d="M5 7h14M5 12h14M5 17h14" /><circle cx="9" cy="7" r="1.8" fill="var(--coxia)" /><circle cx="15" cy="12" r="1.8" fill="var(--coxia)" /><circle cx="8" cy="17" r="1.8" fill="var(--coxia)" /></>);
export const IcMapa = () => wrap(<><path d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10z" /><circle cx="12" cy="11" r="2.2" /></>);
export const IcDados = () => wrap(<><path d="M5 20V10M12 20V5M19 20v-7" /></>);
export const IcVivo = () => wrap(<><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4" /></>);
export const IcBusca = () => wrap(<><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></>);
export const IcFechar = () => wrap(<path d="M6 6l12 12M18 6 6 18" />);
export const IcCheck = () => <svg {...base} width={16} height={16} strokeWidth={2.4}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const IcCopiar = () => wrap(<><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2" /></>);
export const IcLink = () => wrap(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" /></>);
export const IcInfo = () => wrap(<><circle cx="12" cy="12" r="8" /><path d="M12 11v5M12 8v.01" /></>);
export const IcSeta = () => <svg {...base} width={16} height={16}><path d="m9 6 6 6-6 6" /></svg>;
