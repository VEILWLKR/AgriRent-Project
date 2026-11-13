import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Edit3, Plus, Search, Tractor, Wrench } from 'lucide-react';
import { Equipment, User } from '../types';
import { formatNaira } from '../utils/formatters';
import { getEquipmentDisplayImage } from '../utils/equipmentImages';

interface FleetManagementProps {
  currentUser: User;
  fleetList: Equipment[];
  onOpenAddEquipmentModal: () => void;
  onEditEquipment: (equipment: Equipment) => void;
  onToggleEquipmentStatus: (equipmentId: string) => Promise<void>;
  onNavigateToDashboard: () => void;
}

export const FleetManagement: React.FC<FleetManagementProps> = ({ currentUser, fleetList, onOpenAddEquipmentModal, onEditEquipment, onToggleEquipmentStatus, onNavigateToDashboard }) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Equipment['availability']>('all');
  const [savingId, setSavingId] = useState<string | null>(null);

  const filteredFleet = useMemo(() => fleetList.filter(machine => {
    const matchesQuery = `${machine.title} ${machine.category} ${machine.locationLGA} ${machine.locationState}`.toLowerCase().includes(query.toLowerCase().trim());
    return matchesQuery && (status === 'all' || machine.availability === status);
  }), [fleetList, query, status]);

  const toggleStatus = async (machine: Equipment) => {
    setSavingId(machine.id);
    try { await onToggleEquipmentStatus(machine.id); } finally { setSavingId(null); }
  };

  return <div className="min-h-screen bg-[#F7F8F4] text-[#202820]">
    <header className="bg-white border-b border-[#DCE9DE] px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 rounded-[10px] bg-[#174D35] flex items-center justify-center text-white shrink-0"><Tractor className="w-5 h-5 text-[#E6A23C]" /></div><div className="min-w-0"><p className="text-[11px] uppercase tracking-wider font-bold text-[#174D35]">Owner tools</p><h1 className="text-xl sm:text-2xl font-bold text-[#103B2A] truncate">Manage your fleet</h1><p className="text-xs text-[#202820]/60 truncate">{currentUser.name} · {fleetList.length} listed machine{fleetList.length === 1 ? '' : 's'}</p></div></div>
      <button type="button" onClick={onNavigateToDashboard} className="min-h-[42px] px-3 sm:px-4 border border-[#DCE9DE] rounded-lg text-xs font-semibold text-[#103B2A] hover:bg-[#F7F8F4] flex items-center gap-2 shrink-0"><ArrowLeft className="w-4 h-4" /> Dashboard</button>
    </header>

    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 lg:py-8 space-y-6">
      <section className="bg-[#103B2A] text-white rounded-2xl p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5"><div><p className="text-xs text-[#E6A23C] font-bold uppercase tracking-wider">Fleet operations</p><h2 className="text-2xl sm:text-3xl font-bold mt-2">Keep every machine ready to rent.</h2><p className="text-sm text-white/75 mt-2 max-w-xl">Update availability, maintain accurate listings, and keep your equipment details current for farmers.</p></div><button type="button" onClick={onOpenAddEquipmentModal} className="min-h-[44px] px-4 rounded-lg bg-[#E6A23C] text-[#103B2A] text-xs font-bold flex items-center gap-2 w-fit"><Plus className="w-4 h-4" /> Add equipment</button></section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{[
        ['Total machines', fleetList.length], ['Available', fleetList.filter(item => item.availability === 'Available').length], ['Active rentals', fleetList.filter(item => item.availability === 'Active rental').length], ['Maintenance', fleetList.filter(item => item.availability === 'Maintenance').length],
      ].map(([label, value]) => <div key={String(label)} className="bg-white rounded-2xl border border-[#DCE9DE] p-4 sm:p-5 agri-card-shadow"><p className="text-xs text-[#202820]/65">{label}</p><p className="text-2xl font-bold text-[#103B2A] mt-2">{value}</p></div>)}</section>

      <section className="space-y-4"><div className="flex flex-col sm:flex-row gap-3 justify-between"><div className="relative flex-1 max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#174D35]/70" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your equipment, category, or location..." className="w-full min-h-[44px] pl-9 pr-3 bg-white border border-[#DCE9DE] rounded-xl text-xs focus:outline-none focus:border-[#174D35]" /></div><select value={status} onChange={event => setStatus(event.target.value as typeof status)} className="min-h-[44px] px-3 bg-white border border-[#DCE9DE] rounded-xl text-xs text-[#103B2A]"><option value="all">All statuses</option><option value="Available">Available</option><option value="Active rental">Active rental</option><option value="Maintenance">Maintenance</option></select></div>
        {filteredFleet.length === 0 ? <div className="bg-white rounded-2xl border border-[#DCE9DE] p-10 text-center text-xs text-[#202820]/65">No equipment matches these filters.</div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filteredFleet.map(machine => <article key={machine.id} className="bg-white rounded-2xl border border-[#DCE9DE] p-4 sm:p-5 agri-card-shadow"><div className="flex gap-4">        <img src={getEquipmentDisplayImage(machine)} alt={machine.title} className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover bg-[#E3ECE5] shrink-0" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] uppercase tracking-wider font-bold text-[#174D35]">{machine.category}</p><h3 className="text-base font-bold text-[#103B2A] mt-1 truncate">{machine.title}</h3></div><span className={`text-[10px] font-bold rounded-full px-2 py-1 shrink-0 ${machine.availability === 'Maintenance' ? 'bg-[#FEF4E5] text-[#8a5a00]' : machine.availability === 'Active rental' ? 'bg-[#E3ECE5] text-[#174D35]' : 'bg-[#DCE9DE] text-[#174D35]'}`}>{machine.availability}</span></div><p className="text-xs text-[#202820]/65 mt-2">{machine.locationLGA}, {machine.locationState}</p><p className="text-xs font-semibold text-[#103B2A] mt-2">{formatNaira(machine.dailyRate)} <span className="font-normal text-[#202820]/60">/ day · {machine.horsepower} HP</span></p></div></div><div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#DCE9DE]"><button type="button" onClick={() => onEditEquipment(machine)} className="min-h-[40px] flex-1 px-3 border border-[#DCE9DE] rounded-lg text-xs font-semibold text-[#103B2A] hover:bg-[#F7F8F4] inline-flex items-center justify-center gap-1.5"><Edit3 className="w-3.5 h-3.5" /> Edit listing</button><button type="button" disabled={savingId === machine.id} onClick={() => void toggleStatus(machine)} className="min-h-[40px] flex-1 px-3 bg-[#174D35] text-white rounded-lg text-xs font-semibold hover:bg-[#103B2A] disabled:opacity-60 inline-flex items-center justify-center gap-1.5">{savingId === machine.id ? <Wrench className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} {savingId === machine.id ? 'Saving...' : 'Change status'}</button></div></article>)}</div>}
      </section>
    </main>
  </div>;
};
