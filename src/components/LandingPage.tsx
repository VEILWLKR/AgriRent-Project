import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Truck,
  Award,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Equipment, EquipmentCategory } from '../types';
import { CategoryIcon } from './CategoryIcons';
import { formatNaira } from '../utils/formatters';
import { calculateLocationProximityScore, distanceBetweenCoordinates, getCurrentCoordinates, geocodeNigeriaLocation } from '../utils/location';
import { getEquipmentDisplayImage } from '../utils/equipmentImages';

interface LandingPageProps {
  equipmentList: Equipment[];
  onSelectCategory: (category: EquipmentCategory) => void;
  onSelectEquipmentForBooking: (equipment: Equipment) => void;
  onNavigateToMarketplace: (searchParams?: { query?: string; location?: string; category?: string }) => void;
  onOpenAddEquipment: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  equipmentList,
  onSelectCategory,
  onSelectEquipmentForBooking,
  onNavigateToMarketplace,
  onOpenAddEquipment,
}) => {
  const [selectedMachineType, setSelectedMachineType] = useState<string>('All Equipment');
  const [locationInput, setLocationInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>('2026-11-14');
  const [equipmentDistances, setEquipmentDistances] = useState<Record<string, number | null>>({});
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const categories: { label: EquipmentCategory; count: number; desc: string }[] = [
    { label: 'Tractors', count: 48, desc: '50HP - 150HP 4WD units' },
    { label: 'Harvesters', count: 18, desc: 'Rice, maize & grain combine headers' },
    { label: 'Tillers', count: 26, desc: 'Heavy rotavators & disc harrows' },
    { label: 'Planters', count: 15, desc: 'Pneumatic 4-6 row seed drills' },
    { label: 'Irrigation', count: 22, desc: 'High-flow diesel pump sets' },
    { label: 'Trailers', count: 14, desc: '6-10 tonne tipping haulage' },
  ];

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const origin = locationInput.trim()
        ? await geocodeNigeriaLocation(locationInput)
        : await getCurrentCoordinates();
      if (!origin) return;
      const distances = await Promise.all(equipmentList.map(async item => {
        const target = await geocodeNigeriaLocation([item.locationLGA, item.locationState].filter(Boolean).join(', '));
        return [item.id, target ? Number(distanceBetweenCoordinates(origin, target).toFixed(1)) : null] as const;
      }));
      if (!cancelled) setEquipmentDistances(Object.fromEntries(distances));
    })();
    return () => { cancelled = true; };
  }, [equipmentList, locationInput]);

  // Recommend equipment starting with the ones closest to the selected location.
  const recommendedFeatured = useMemo(() => {
    const ranked = [...equipmentList].sort((a, b) => {
      const distanceA = equipmentDistances[a.id];
      const distanceB = equipmentDistances[b.id];
      if (distanceA !== undefined || distanceB !== undefined) {
        if (distanceA === null || distanceA === undefined) return 1;
        if (distanceB === null || distanceB === undefined) return -1;
        if (distanceA !== distanceB) return distanceA - distanceB;
      }
      const scoreA = calculateLocationProximityScore(a.locationState, a.locationLGA, locationInput);
      const scoreB = calculateLocationProximityScore(b.locationState, b.locationLGA, locationInput);
      if (scoreB !== scoreA) {
        return scoreB - scoreA; // higher proximity first
      }
      return b.ownerRating - a.ownerRating;
    });
    const categoryLeaders: Equipment[] = [];
    const seenCategories = new Set<EquipmentCategory>();
    ranked.forEach(item => {
      if (!seenCategories.has(item.category)) {
        seenCategories.add(item.category);
        categoryLeaders.push(item);
      }
    });
    return [...categoryLeaders, ...ranked.filter(item => !categoryLeaders.includes(item))];
  }, [equipmentList, locationInput, equipmentDistances]);

  useEffect(() => {
    setFeaturedIndex(index => recommendedFeatured.length ? index % recommendedFeatured.length : 0);
  }, [recommendedFeatured.length]);

  useEffect(() => {
    if (recommendedFeatured.length < 2) return;
    const timer = window.setInterval(() => {
      setFeaturedIndex(index => (index + 1) % recommendedFeatured.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [recommendedFeatured.length]);

  const getFeaturedItem = (offset: number) => {
    if (!recommendedFeatured.length) return null;
    const index = (featuredIndex + offset + recommendedFeatured.length) % recommendedFeatured.length;
    return recommendedFeatured[index];
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigateToMarketplace({
      query: selectedMachineType === 'All Equipment' ? '' : selectedMachineType,
      location: locationInput,
      category: selectedMachineType === 'All Equipment' ? undefined : selectedMachineType,
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F8F4] overflow-x-hidden w-full">
      {/* Hero Section */}
      <section className="relative bg-[#103B2A] text-white pt-8 pb-14 sm:pt-14 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Headline & Search Form */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#174D35] text-[#DCE9DE] text-xs font-semibold tracking-wide border border-white/10 max-w-full">
                <ShieldCheck className="w-4 h-4 text-[#E6A23C] shrink-0" />
                <span className="truncate">Nationwide Agricultural Machinery Rental</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-bold text-white tracking-tight leading-[1.15] text-balance">
                Rent the right machine for every season.
              </h1>

              <p className="text-sm sm:text-base text-white/80 max-w-xl font-normal leading-relaxed">
                Explore sample tractor, harvester, and implement listings across Nigeria. This showcase saves booking requests, but payment, escrow, and delivery services are not connected.
              </p>

              {/* Responsive Search Form */}
              <form 
                onSubmit={handleSearchSubmit}
                className="bg-white rounded-[14px] p-3 shadow-xl text-[#202820] flex flex-col md:flex-row md:items-center gap-3 border border-[#DCE9DE]"
              >
                {/* Machine Type */}
                <div className="flex-1 px-2.5 py-1.5 border-b md:border-b-0 md:border-r border-[#DCE9DE]">
                  <label className="block text-[11px] font-semibold text-[#174D35] uppercase tracking-wider mb-1">
                    Machine Type
                  </label>
                  <select
                    value={selectedMachineType}
                    onChange={(e) => setSelectedMachineType(e.target.value)}
                    className="w-full bg-transparent min-h-[44px] text-xs sm:text-sm font-medium text-[#202820] focus:outline-none cursor-pointer"
                  >
                    <option value="All Equipment">All Machinery</option>
                    <option value="Tractors">Tractors (50HP - 150HP)</option>
                    <option value="Harvesters">Combine Harvesters</option>
                    <option value="Tillers">Rotary Tillers & Harrows</option>
                    <option value="Planters">Precision Planters</option>
                    <option value="Irrigation">Irrigation Pumps</option>
                    <option value="Trailers">Grain Tipping Trailers</option>
                  </select>
                </div>

                {/* Location */}
                <div className="flex-1 px-2.5 py-1.5 border-b md:border-b-0 md:border-r border-[#DCE9DE]">
                  <label className="block text-[11px] font-semibold text-[#174D35] uppercase tracking-wider mb-1">
                    Farm Location / State
                  </label>
                  <div className="flex items-center gap-1.5 min-h-[44px]">
                    <MapPin className="w-4 h-4 text-[#174D35]/70 shrink-0" />
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="e.g. Kano, Benue, Ibadan, Zaria"
                      className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#202820] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="flex-1 px-2.5 py-1.5">
                  <label className="block text-[11px] font-semibold text-[#174D35] uppercase tracking-wider mb-1">
                    Rental Date
                  </label>
                  <div className="flex items-center gap-1.5 min-h-[44px]">
                    <Calendar className="w-4 h-4 text-[#174D35]/70 shrink-0" />
                    <input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#202820] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Search CTA with min 44px tap target */}
                <button
                  type="submit"
                  className="w-full md:w-auto min-h-[44px] px-6 py-3 bg-[#174D35] hover:bg-[#103B2A] text-white rounded-[10px] text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm"
                >
                  <Search className="w-4 h-4 text-[#E6A23C]" />
                  <span>Search</span>
                </button>
              </form>
            </div>

            {/* Right Hero Image Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-[16px] overflow-hidden border border-white/20 shadow-xl bg-[#174D35]">
                <img
                  src="/src/assets/images/agri_tractor_field_1794305594217.jpg"
                  alt="Agricultural tractor working in farm field in Nigeria"
                  referrerPolicy="no-referrer"
                  className="w-full h-64 sm:h-80 lg:h-96 object-cover"
                />
                
                {/* Overlay Badge - No Distance */}
                <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-sm rounded-[10px] p-3 text-[#202820] shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#174D35] text-white flex items-center justify-center font-bold shrink-0">
                      <Award className="w-4 h-4 text-[#E6A23C]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#103B2A] truncate">John Deere 5075E 4WD</p>
                      <p className="text-[11px] text-[#202820]/70 truncate">Verified Asset &middot; Ibadan Hub, Oyo State</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-sm font-bold text-[#174D35] font-mono">₦45,000</span>
                    <span className="text-[10px] text-[#202820]/60 block">/ day</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Browse Grid */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-8 gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#174D35] block mb-1">
              Fleet Taxonomy
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#103B2A] tracking-tight">
              Browse by Equipment Category
            </h2>
          </div>
          <button
            onClick={() => onNavigateToMarketplace()}
            className="min-h-[44px] inline-flex items-center text-xs sm:text-sm font-semibold text-[#174D35] hover:text-[#103B2A] gap-1 group"
          >
            <span>View all machinery</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat) => (
            <button
              key={cat.label}
              onClick={() => onSelectCategory(cat.label)}
              className="min-h-[88px] bg-white rounded-[10px] p-4 text-left border border-[#DCE9DE] hover:border-[#174D35] transition-all agri-card-shadow group focus:outline-none flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-[8px] bg-[#DCE9DE]/40 text-[#174D35] flex items-center justify-center mb-2.5 group-hover:bg-[#174D35] group-hover:text-white transition-colors">
                  <CategoryIcon category={cat.label} className="w-5 h-5 stroke-[1.75]" />
                </div>
                <h3 className="text-sm font-semibold text-[#103B2A] group-hover:text-[#174D35] transition-colors">
                  {cat.label}
                </h3>
                <p className="text-xs font-medium text-[#174D35] mt-0.5">
                  {cat.count} Available
                </p>
              </div>
              <p className="text-[10px] text-[#202820]/60 mt-1 line-clamp-1">
                {cat.desc}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Equipment Section - Animated proximity carousel */}
      <section className="py-12 bg-white border-y border-[#DCE9DE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 sm:mb-8 gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#174D35] block mb-1">
                Verified Machinery
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#103B2A] tracking-tight">
                Featured Machinery for Rent
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#202820]/70 max-w-md">
              Illustrative equipment listings. Verification, insurance, and payment protections are not active in this showcase.
            </p>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-[#202820]/60">Swipe through nearby machinery or use the arrows</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setFeaturedIndex(index => recommendedFeatured.length ? (index - 1 + recommendedFeatured.length) % recommendedFeatured.length : 0)} className="min-w-[44px] min-h-[44px] rounded-full border border-[#DCE9DE] bg-white text-[#174D35] flex items-center justify-center hover:border-[#174D35] transition-colors" aria-label="Previous machinery">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setFeaturedIndex(index => recommendedFeatured.length ? (index + 1) % recommendedFeatured.length : 0)} className="min-w-[44px] min-h-[44px] rounded-full border border-[#DCE9DE] bg-white text-[#174D35] flex items-center justify-center hover:border-[#174D35] transition-colors" aria-label="Next machinery">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 items-stretch gap-4 md:gap-5 overflow-hidden py-2 px-1">
            {[-1, 0, 1].map(offset => {
              const item = getFeaturedItem(offset);
              if (!item) return null;
              return (
              <div 
                key={`${item.id}-${offset}-${featuredIndex}`}
                onClick={() => setFeaturedIndex(recommendedFeatured.indexOf(item))}
                className={`${offset === 0 ? 'flex md:scale-[1.04] md:z-10 shadow-lg' : 'hidden md:flex md:scale-[0.96] opacity-80'} cursor-pointer bg-[#F7F8F4] rounded-[14px] overflow-hidden border border-[#DCE9DE] flex-col hover:border-[#174D35] transition-all duration-500 agri-card-shadow group`}
              >
                {/* Machine Image Preview */}
                <div className="relative h-48 sm:h-52 bg-neutral-200 overflow-hidden">
                  <img
                    src={getEquipmentDisplayImage(item)}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Status and distance badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-[#174D35] text-white shadow-xs">
                      {item.availability}
                    </span>
                    <span className="px-2 py-1 rounded-[6px] text-xs font-semibold bg-white/90 text-[#103B2A] shadow-xs">
                      Verified Asset
                    </span>
                  </div>

                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-[4px] bg-black/60 text-white text-[11px] font-mono">
                    {equipmentDistances[item.id] !== undefined && equipmentDistances[item.id] !== null
                      ? `${equipmentDistances[item.id]} km away`
                      : 'Distance unavailable'}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#202820]/70 mb-1">
                      <span className="font-semibold text-[#174D35] uppercase tracking-wider text-[11px]">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#103B2A] leading-snug group-hover:text-[#174D35] transition-colors">
                      {item.title}
                    </h3>

                    {/* Location: State & LGA */}
                    <p className="text-xs text-[#202820]/70 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#174D35]/70 shrink-0" />
                      <span className="truncate">{item.locationLGA}, {item.locationState}</span>
                    </p>

                    <div className="mt-3 py-2 border-t border-[#DCE9DE] text-xs text-[#202820]/80 space-y-1">
                      <p className="flex items-center justify-between">
                        <span className="text-[#202820]/60">Owner:</span>
                        <span className="font-medium text-[#103B2A] truncate max-w-[180px]">{item.ownerName}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-[#202820]/60">Implement:</span>
                        <span className="font-medium text-[#103B2A] truncate max-w-[180px]">{item.specs.workingWidth || item.specs.condition}</span>
                      </p>
                    </div>
                  </div>

                  {/* Pricing and Action - 44px min tap target */}
                  <div className="mt-4 pt-3 border-t border-[#DCE9DE] flex items-center justify-between">
                    <div>
                      <span className="text-base sm:text-lg font-bold text-[#174D35] font-mono">
                        {formatNaira(item.dailyRate)}
                      </span>
                      <span className="text-xs text-[#202820]/60"> / day</span>
                    </div>

                    <button
                      onClick={() => onSelectEquipmentForBooking(item)}
                      className="min-h-[44px] px-4 py-2 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-semibold rounded-[8px] transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <span>Rent Now</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#E6A23C]" />
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
            </div>
          </div>
        </div>
      </section>

      {/* Showcase booking flow */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#174D35] block mb-1">
            Showcase workflow
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#103B2A] tracking-tight">
            How Equipment Booking Works
          </h2>
          <p className="text-xs sm:text-sm text-[#202820]/70 mt-1">
            Booking requests are stored by the API. Payment, escrow, logistics, and insurance integrations are not active.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-[12px] p-5 sm:p-6 border border-[#DCE9DE] agri-card-shadow">
            <div className="w-8 h-8 rounded-full bg-[#DCE9DE] text-[#174D35] flex items-center justify-center font-bold text-xs mb-3">
              1
            </div>
            <h3 className="text-sm font-bold text-[#103B2A] mb-1.5">Submit a booking request</h3>
            <p className="text-xs text-[#202820]/70 leading-relaxed">
              Select dates and equipment. Your estimated total and request are saved; no payment is collected.
            </p>
          </div>

          <div className="bg-white rounded-[12px] p-5 sm:p-6 border border-[#DCE9DE] agri-card-shadow">
            <div className="w-8 h-8 rounded-full bg-[#DCE9DE] text-[#174D35] flex items-center justify-center font-bold text-xs mb-3">
              2
            </div>
            <h3 className="text-sm font-bold text-[#103B2A] mb-1.5">Field Delivery & Intake Check</h3>
            <p className="text-xs text-[#202820]/70 leading-relaxed">
              Owners can review incoming requests in their dashboard. Transport arrangements are outside this showcase.
            </p>
          </div>

          <div className="bg-white rounded-[12px] p-5 sm:p-6 border border-[#DCE9DE] agri-card-shadow">
            <div className="w-8 h-8 rounded-full bg-[#DCE9DE] text-[#174D35] flex items-center justify-center font-bold text-xs mb-3">
              3
            </div>
            <h3 className="text-sm font-bold text-[#103B2A] mb-1.5">Payment integration not active</h3>
            <p className="text-xs text-[#202820]/70 leading-relaxed">
              Booking amounts are estimates. No escrow, card charge, transfer, payout, or insurance transaction is made.
            </p>
          </div>
        </div>
      </section>

      {/* For Equipment Owners Callout */}
      <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#103B2A] rounded-[16px] p-6 sm:p-10 text-white relative overflow-hidden shadow-lg">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#E6A23C]">
              Own Agricultural Machinery?
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              List Your Machinery in the Showcase
            </h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Add listings and review booking requests. Payouts, verification, logistics, and machinery insurance are not integrated.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={onOpenAddEquipment}
                className="min-h-[44px] px-5 py-2.5 bg-[#E6A23C] hover:bg-[#d4902b] text-[#103B2A] text-xs font-bold rounded-[8px] transition-colors shadow-sm"
              >
                List Your Equipment
              </button>
              <button
                onClick={() => onNavigateToMarketplace()}
                className="min-h-[44px] px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-[8px] transition-colors border border-white/20"
              >
                View Marketplace Rates
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#103B2A] text-white border-t border-white/10 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <span className="text-base font-bold tracking-tight">AgriRent Nigeria</span>
              <p className="text-xs text-white/70 leading-relaxed">
                A showcase for agricultural equipment rentals. Listings and dashboard activity may include illustrative sample data.
              </p>
              <p className="text-xs text-[#E6A23C]">
                Nationwide Coverage
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#DCE9DE] mb-2.5">
                Showcase integrations
              </h4>
              <ul className="text-xs text-white/70 space-y-2">
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#E6A23C]" />
                  Payment provider not connected
                </li>
                <li className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#E6A23C]" />
                  Logistics provider not connected
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#E6A23C]" />
                  Sample equipment listings
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#DCE9DE] mb-2.5">
                Support
              </h4>
              <p className="text-xs text-white/70">Phone: +234 (0) 700-AGRI-RENT</p>
              <p className="text-xs text-white/70 mt-1">Email: support@agrirent.ng</p>
              <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-white/50">
                &copy; 2026 AgriRent Technology Nigeria Ltd. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
