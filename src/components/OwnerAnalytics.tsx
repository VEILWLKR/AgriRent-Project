import React, { useMemo } from 'react';
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, Gauge, Star, Tractor } from 'lucide-react';
import { Equipment, RentalRequest, User } from '../types';
import { formatNaira } from '../utils/formatters';

interface OwnerAnalyticsProps { currentUser: User; fleetList: Equipment[]; rentalRequests: RentalRequest[]; onNavigateToDashboard: () => void; }

export const OwnerAnalytics: React.FC<OwnerAnalyticsProps> = ({ currentUser, fleetList, rentalRequests, onNavigateToDashboard }) => {
  const accepted = rentalRequests.filter(request => request.status === 'accepted');
  const pending = rentalRequests.filter(request => request.status === 'pending');
  const active = fleetList.filter(machine => machine.availability === 'Active rental').length;
  const utilisation = fleetList.length ? Math.round((active / fleetList.length) * 100) : 0;
  const rated = fleetList.filter(machine => machine.ownerRating > 0);
  const averageRating = rated.length ? (rated.reduce((sum, machine) => sum + machine.ownerRating, 0) / rated.length).toFixed(1) : '—';
  const acceptedValue = accepted.reduce((sum, request) => sum + request.totalPayout, 0);
  const equipmentPerformance = useMemo(() => [...fleetList].sort((a, b) => (b.novemberEarnings || 0) - (a.novemberEarnings || 0)), [fleetList]);
  const metrics: Array<{ icon: React.ElementType; label: string; value: string | number; subtext: string }> = [
    { icon: Tractor, label: 'Fleet size', value: fleetList.length, subtext: 'listed machines' },
    { icon: Gauge, label: 'Utilisation', value: `${utilisation}%`, subtext: `${active} active rentals` },
    { icon: CheckCircle2, label: 'Accepted requests', value: accepted.length, subtext: formatNaira(acceptedValue) },
    { icon: Star, label: 'Average rating', value: averageRating, subtext: `${rated.reduce((sum, machine) => sum + machine.ownerReviewCount, 0)} reviews` },
  ];

  return <div className="min-h-screen bg-[#F7F8F4] text-[#202820]">
    <header className="bg-white border-b border-[#DCE9DE] px-4 sm:px-8 py-4 flex items-center justify-between gap-4"><div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-[10px] bg-[#174D35] flex items-center justify-center text-white shrink-0"><BarChart3 className="w-5 h-5 text-[#E6A23C]" /></div><div className="min-w-0"><p className="text-[11px] uppercase tracking-wider font-bold text-[#174D35]">Owner analytics</p><h1 className="text-xl sm:text-2xl font-bold text-[#103B2A] truncate">Fleet performance</h1><p className="text-xs text-[#202820]/60 truncate">{currentUser.name} · Recorded account data</p></div></div><button type="button" onClick={onNavigateToDashboard} className="min-h-[42px] px-3 sm:px-4 border border-[#DCE9DE] rounded-lg text-xs font-semibold text-[#103B2A] hover:bg-[#F7F8F4] flex items-center gap-2 shrink-0"><ArrowLeft className="w-4 h-4" /> Dashboard</button></header>
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 lg:py-8 space-y-6"><section className="bg-[#103B2A] text-white rounded-2xl p-5 sm:p-7"><p className="text-xs text-[#E6A23C] font-bold uppercase tracking-wider">Decision support</p><h2 className="text-2xl sm:text-3xl font-bold mt-2">Understand what is driving your fleet.</h2><p className="text-sm text-white/75 mt-2 max-w-2xl">Review utilisation, request conversion, equipment earnings, and customer ratings from records connected to your account.</p></section>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{metrics.map(({ icon: MetricIcon, label, value, subtext }) => <div key={label} className="bg-white rounded-2xl border border-[#DCE9DE] p-4 sm:p-5 agri-card-shadow"><div className="w-8 h-8 rounded-lg bg-[#E3ECE5] text-[#174D35] flex items-center justify-center"><MetricIcon className="w-4 h-4" /></div><p className="text-xs text-[#202820]/65 mt-3">{label}</p><p className="text-xl sm:text-2xl font-bold text-[#103B2A] mt-1">{value}</p><p className="text-[11px] text-[#202820]/60 mt-1">{subtext}</p></div>)}</section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="bg-white rounded-2xl border border-[#DCE9DE] p-5 sm:p-6 agri-card-shadow"><div className="flex items-center justify-between mb-4"><div><h3 className="text-base font-bold text-[#103B2A]">Request pipeline</h3><p className="text-xs text-[#202820]/60 mt-1">Current rental-request status.</p></div><Clock3 className="w-5 h-5 text-[#174D35]" /></div><div className="space-y-4">{[['Pending', pending.length, 'bg-[#FEF4E5]'], ['Accepted', accepted.length, 'bg-[#E3ECE5]'], ['Declined', rentalRequests.filter(request => request.status === 'declined').length, 'bg-red-50']].map(([label, value, colour]) => <div key={String(label)}><div className="flex justify-between text-xs font-semibold text-[#103B2A]"><span>{String(label)}</span><span>{String(value)}</span></div><div className="h-2 rounded-full bg-[#F7F8F4] mt-2 overflow-hidden"><div className={`h-full rounded-full ${colour}`} style={{ width: `${rentalRequests.length ? Number(value) / rentalRequests.length * 100 : 0}%` }} /></div></div>)}</div></div><div className="bg-white rounded-2xl border border-[#DCE9DE] p-5 sm:p-6 agri-card-shadow"><h3 className="text-base font-bold text-[#103B2A]">Equipment performance</h3><p className="text-xs text-[#202820]/60 mt-1">Reported earnings and availability by machine.</p><div className="mt-4 space-y-2 max-h-72 overflow-y-auto">{equipmentPerformance.length === 0 ? <p className="text-xs text-[#202820]/60 bg-[#F7F8F4] rounded-lg p-4 text-center">Add equipment to see performance data.</p> : equipmentPerformance.map(machine => <div key={machine.id} className="flex items-center justify-between gap-3 p-3 bg-[#F7F8F4] rounded-xl"><div className="min-w-0"><p className="text-xs font-bold text-[#103B2A] truncate">{machine.title}</p><p className="text-[11px] text-[#202820]/60">{machine.availability} · {machine.ownerReviewCount} reviews</p></div><span className="text-xs font-bold text-[#174D35] shrink-0">{formatNaira(machine.novemberEarnings || 0)}</span></div>)}</div></div></section>
    </main>
  </div>;
};
