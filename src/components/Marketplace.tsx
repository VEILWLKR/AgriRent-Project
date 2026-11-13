import React, { useState, useMemo, useEffect } from 'react';
import { 
  MapPin, 
  ArrowRight, 
  SlidersHorizontal, 
  Check, 
  Search, 
  Info,
  X,
  Heart
} from 'lucide-react';
import { Equipment, EquipmentCategory, User } from '../types';
import { formatNaira } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcons';
import { calculateLocationProximityScore, NIGERIAN_STATES, distanceBetweenCoordinates, geocodeNigeriaLocation, getDashboardOriginCoordinates } from '../utils/location';
import { getRecentSearches, rememberSearch } from '../utils/search';
import { getEquipmentDisplayImage } from '../utils/equipmentImages';

interface MarketplaceProps {
  equipmentList: Equipment[];
  onSelectEquipmentForBooking: (equipment: Equipment) => void;
  initialCategory?: EquipmentCategory;
  initialQuery?: string;
  userLocation?: string;
  currentUser?: User | null;
  savedEquipmentIds?: string[];
  onToggleFavorite?: (equipmentId: string) => void;
  initialShowSaved?: boolean;
  onNavigateToDashboard?: () => void;
}


export const Marketplace: React.FC<MarketplaceProps> = ({
  equipmentList,
  onSelectEquipmentForBooking,
  initialCategory,
  initialQuery = '',
  userLocation = '',
  currentUser = null,
  savedEquipmentIds = [],
  onToggleFavorite,
  initialShowSaved = false,
  onNavigateToDashboard,
}) => {
  const [filterWishlistOnly, setFilterWishlistOnly] = useState<boolean>(initialShowSaved);

  const [selectedCategories, setSelectedCategories] = useState<EquipmentCategory[]>(
    initialCategory ? [initialCategory] : []
  );
  const [maxBudget, setMaxBudget] = useState<number>(100000);
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const [searchFocused, setSearchFocused] = useState(false);
  const [farmLocationQuery, setFarmLocationQuery] = useState<string>(userLocation);
  const [sortBy, setSortBy] = useState<string>('recommended');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [inspectedEquipment, setInspectedEquipment] = useState<Equipment | null>(null);
  const [equipmentDistances, setEquipmentDistances] = useState<Record<string, number | null>>({});

  const categories: EquipmentCategory[] = [
    'Tractors', 
    'Harvesters', 
    'Irrigation', 
    'Tillers', 
    'Planters', 
    'Trailers',
    'Ploughs',
    'Sprayers',
    'Seeders',
    'Threshers',
    'Balers',
    'Cultivators',
    'Shellers'
  ];

  const toggleCategory = (cat: EquipmentCategory) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setMaxBudget(100000);
    setSelectedAvailability('all');
    setSelectedState('all');
    setMinRating(0);
    setSearchQuery('');
  };

  const submitSearch = (value = searchQuery) => {
    if (!value.trim()) return;
    setRecentSearches(rememberSearch(value));
  };

  useEffect(() => {
    let cancelled = false;
    const originUser = currentUser || {
      role: 'owner' as const,
      hasDualRole: false,
      location: userLocation,
      lga: undefined,
      state: undefined,
    };
    void (async () => {
      const origin = await getDashboardOriginCoordinates(originUser);
      if (!origin) return;
      const entries = await Promise.all(equipmentList.map(async equipment => {
        const target = await geocodeNigeriaLocation([equipment.locationLGA, equipment.locationState].filter(Boolean).join(', '));
        return [equipment.id, target ? Number(distanceBetweenCoordinates(origin, target).toFixed(1)) : null] as const;
      }));
      if (!cancelled) setEquipmentDistances(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [currentUser, equipmentList, userLocation]);

  useEffect(() => {
    if (initialQuery.trim()) setRecentSearches(rememberSearch(initialQuery));
  }, [initialQuery]);

  // Filtered and Sorted list with location proximity recommendation
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter(item => {
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
        return false;
      }
      // Budget filter
      if (item.dailyRate > maxBudget) {
        return false;
      }
      // Availability
      if (selectedAvailability !== 'all' && item.availability !== selectedAvailability) {
        return false;
      }
      // State filter
      if (selectedState !== 'all' && item.locationState !== selectedState) {
        return false;
      }
      // Rating
      if (minRating > 0 && item.ownerRating < minRating) {
        return false;
      }
      // Wishlist filter
      if (filterWishlistOnly && !savedEquipmentIds.includes(item.id)) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchLoc = (item.locationLGA + ' ' + item.locationState).toLowerCase().includes(q);
        const matchOwner = item.ownerName.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        const matchSpecs = `${item.horsepower} hp ${item.availability}`.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchOwner && !matchCategory && !matchSpecs) return false;
      }
      return true;
    }).sort((a, b) => {
      const activeLocationTarget = farmLocationQuery.trim() || userLocation;

      if (sortBy === 'price-low') return a.dailyRate - b.dailyRate;
      if (sortBy === 'price-high') return b.dailyRate - a.dailyRate;
      if (sortBy === 'rating') return b.ownerRating - a.ownerRating;
      if (sortBy === 'hp-high') return b.horsepower - a.horsepower;
      
      // 'recommended' and 'location': use the calculated distance as the primary signal.
      // This keeps newly-created listings from jumping ahead of genuinely closer machinery.
      const distanceA = equipmentDistances[a.id];
      const distanceB = equipmentDistances[b.id];
      if (distanceA !== undefined || distanceB !== undefined) {
        if (distanceA === null || distanceA === undefined) return 1;
        if (distanceB === null || distanceB === undefined) return -1;
        if (distanceA !== distanceB) return distanceA - distanceB;
      }

      const proximityA = calculateLocationProximityScore(a.locationState, a.locationLGA, activeLocationTarget);
      const proximityB = calculateLocationProximityScore(b.locationState, b.locationLGA, activeLocationTarget);

      if (proximityB !== proximityA) {
        return proximityB - proximityA;
      }

      // Available first, then rating
      if (a.availability === 'Available' && b.availability !== 'Available') return -1;
      if (b.availability === 'Available' && a.availability !== 'Available') return 1;
      return b.ownerRating - a.ownerRating;
    });
  }, [equipmentList, selectedCategories, maxBudget, selectedAvailability, selectedState, minRating, searchQuery, farmLocationQuery, userLocation, sortBy, equipmentDistances]);

  return (
    <div className="min-h-screen bg-[#F7F8F4] py-6 sm:py-8 overflow-x-hidden w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Marketplace Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            {onNavigateToDashboard && (
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="mb-2 text-xs font-semibold text-[#174D35] hover:text-[#103B2A] flex items-center gap-1.5 transition-colors"
              >
                <span>&larr; Return to Dashboard</span>
              </button>
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-[#174D35] block">
              Nationwide Equipment Network &middot; Serving All 36 States &amp; FCT
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#103B2A] tracking-tight">
              Agricultural Equipment Marketplace
            </h1>
            <p className="text-xs sm:text-sm text-[#202820]/70">
              {filteredEquipment.length} machines matching your criteria &middot; Prioritized by proximity to your farm location
            </p>
          </div>


          {/* Search Input & Mobile Filter Toggle */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-[#174D35]/70 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tractor, state, owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
                className="w-full min-h-[44px] pl-9 pr-8 py-2.5 bg-white rounded-[10px] text-xs font-medium border border-[#DCE9DE] focus:outline-none focus:border-[#174D35] text-[#202820]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="w-8 h-8 absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {searchFocused && recentSearches.length > 0 && !searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-[#DCE9DE] rounded-xl shadow-lg p-2">
                  <p className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-[#202820]/50">Recent searches</p>
                  {recentSearches.map(recent => (
                    <button key={recent} type="button" onMouseDown={() => { setSearchQuery(recent); setSearchFocused(false); submitSearch(recent); }} className="w-full text-left px-2 py-2 rounded-lg text-xs text-[#103B2A] hover:bg-[#F7F8F4]">{recent}</button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="lg:hidden min-h-[44px] min-w-[44px] px-3 py-2 bg-white rounded-[10px] border border-[#DCE9DE] text-xs font-semibold text-[#103B2A] flex items-center justify-center gap-1.5 shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#174D35]" />
              <span>Filters</span>
              {(selectedCategories.length > 0 || maxBudget < 100000 || selectedAvailability !== 'all' || selectedState !== 'all') && (
                <span className="w-2 h-2 rounded-full bg-[#E6A23C]" />
              )}
            </button>
          </div>
        </div>

        {/* Layout Grid: Sidebar Filters + Main Results */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Desktop & Mobile Sidebar Filters */}
          <aside className={`lg:block ${mobileFilterOpen ? 'block' : 'hidden'} lg:col-span-1 space-y-6`}>
            <div className="bg-white rounded-[12px] p-5 border border-[#DCE9DE] agri-card-shadow space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#DCE9DE]">
                <h3 className="text-sm font-bold text-[#103B2A] flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#174D35]" />
                  Filter Equipment
                </h3>
                <button
                  onClick={clearFilters}
                  className="min-h-[44px] inline-flex items-center text-xs text-[#174D35] font-semibold hover:underline"
                >
                  Reset All
                </button>
              </div>

              {/* Farm Location Filter / Proximity Anchor */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#103B2A] mb-1.5">
                  My Farm Location
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-[#174D35] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={farmLocationQuery}
                    onChange={(e) => setFarmLocationQuery(e.target.value)}
                    placeholder="e.g. Kano, Benue, Ibadan, Zaria"
                    className="w-full min-h-[44px] pl-8 pr-3 py-2 text-xs bg-[#F7F8F4] rounded-[8px] border border-[#DCE9DE] font-medium text-[#202820] focus:outline-none focus:border-[#174D35]"
                  />
                </div>
                <p className="text-[10px] text-[#202820]/60 mt-1">
                  Machinery closer to this location will appear first in results.
                </p>
              </div>

              {/* State Filter Dropdown */}
              <div className="pt-2 border-t border-[#DCE9DE]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#103B2A] mb-2">
                  Filter by State
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-[#F7F8F4] border border-[#DCE9DE] rounded-[8px] text-xs font-medium text-[#103B2A] focus:outline-none"
                >
                  <option value="all">All Nigerian States (Nationwide)</option>
                  {NIGERIAN_STATES.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>

              {/* Category Checkboxes */}
              <div className="pt-2 border-t border-[#DCE9DE]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#103B2A] mb-2.5">
                  Categories
                </label>
                <div className="space-y-1.5">
                  {categories.map((cat) => {
                    const isChecked = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-[8px] text-xs transition-colors ${
                          isChecked ? 'bg-[#DCE9DE]/40 text-[#103B2A] font-semibold' : 'text-[#202820]/80 hover:bg-[#F7F8F4]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-[#174D35] border-[#174D35] text-white' : 'border-[#DCE9DE] bg-white'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span>{cat}</span>
                        </div>
                        <CategoryIcon category={cat} className="w-4 h-4 text-[#174D35]/70" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Daily Budget Slider */}
              <div className="pt-2 border-t border-[#DCE9DE]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#103B2A]">
                    Max Daily Rate
                  </label>
                  <span className="text-xs font-bold font-mono text-[#174D35]">
                    {formatNaira(maxBudget)}
                  </span>
                </div>
                <input
                  type="range"
                  min="15000"
                  max="120000"
                  step="5000"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(Number(e.target.value))}
                  className="w-full accent-[#174D35] cursor-pointer h-2"
                />
                <div className="flex justify-between text-[10px] text-[#202820]/60 mt-1 font-mono">
                  <span>₦15k</span>
                  <span>₦60k</span>
                  <span>₦120k</span>
                </div>
              </div>

              {/* Availability Status */}
              <div className="pt-2 border-t border-[#DCE9DE]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#103B2A] mb-2">
                  Availability
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'All Units' },
                    { id: 'Available', label: 'Available Now' },
                    { id: 'Active rental', label: 'In Field' },
                    { id: 'Maintenance', label: 'Service' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedAvailability(item.id)}
                      className={`min-h-[44px] px-2 py-2 text-xs rounded-[8px] text-center font-medium transition-colors ${
                        selectedAvailability === item.id 
                          ? 'bg-[#174D35] text-white font-semibold' 
                          : 'bg-[#F7F8F4] text-[#202820]/80 hover:bg-[#DCE9DE]/40'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>


              {/* Mobile Close Button */}
              <div className="lg:hidden pt-2">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full min-h-[44px] py-2.5 bg-[#174D35] text-white rounded-[8px] text-xs font-bold"
                >
                  Apply Filters &amp; View ({filteredEquipment.length})
                </button>
              </div>
            </div>
          </aside>

          {/* Results Grid Section */}
          <main className="lg:col-span-3 space-y-4">
            {/* Sorting Bar */}
            <div className="bg-white rounded-[10px] px-4 py-3 border border-[#DCE9DE] flex flex-wrap items-center justify-between gap-3 agri-card-shadow">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterWishlistOnly(false)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all ${
                    !filterWishlistOnly 
                      ? 'bg-[#174D35] text-white shadow-xs' 
                      : 'bg-[#F7F8F4] text-[#202820]/70 hover:text-[#103B2A]'
                  }`}
                >
                  All Machinery ({equipmentList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterWishlistOnly(true)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    filterWishlistOnly 
                      ? 'bg-[#174D35] text-white shadow-xs' 
                      : 'bg-[#F7F8F4] text-[#202820]/70 hover:text-[#103B2A]'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${filterWishlistOnly ? 'fill-current text-[#E6A23C]' : 'text-[#202820]/60'}`} />
                  <span>Saved Wishlist ({savedEquipmentIds.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-[#202820]/70 shrink-0">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="min-h-[44px] bg-[#F7F8F4] border border-[#DCE9DE] rounded-[8px] text-xs font-medium text-[#103B2A] px-3 py-2 focus:outline-none"
                >
                  <option value="recommended">Closer to My Farm Location</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="hp-high">Highest Horsepower</option>
                </select>
              </div>
            </div>

            {/* Empty State */}
            {filteredEquipment.length === 0 && (
              <div className="bg-white rounded-[12px] p-12 text-center border border-[#DCE9DE]">
                <div className="w-12 h-12 rounded-full bg-[#DCE9DE] text-[#174D35] flex items-center justify-center mx-auto mb-3">
                  {filterWishlistOnly ? <Heart className="w-6 h-6 text-[#174D35]" /> : <Search className="w-6 h-6" />}
                </div>
                <h3 className="text-base font-bold text-[#103B2A]">
                  {filterWishlistOnly ? 'No saved machinery yet' : 'No machinery found'}
                </h3>
                <p className="text-xs text-[#202820]/70 max-w-sm mx-auto mt-1 mb-4">
                  {filterWishlistOnly 
                    ? 'Click the heart icon on any tractor, harvester, or implement to save it for quick access here.'
                    : 'We could not find any equipment matching your current filters. Try expanding your daily budget or choosing another state.'}
                </p>
                <button
                  onClick={() => {
                    setFilterWishlistOnly(false);
                    clearFilters();
                  }}
                  className="min-h-[44px] px-5 py-2.5 bg-[#174D35] text-white text-xs font-semibold rounded-[8px]"
                >
                  {filterWishlistOnly ? 'Browse All Machinery' : 'Clear All Filters'}
                </button>
              </div>
            )}

            {/* Equipment Grid - distance is calculated from the role-aware user origin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredEquipment.map((item) => {
                const isSaved = savedEquipmentIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-[12px] overflow-hidden border border-[#DCE9DE] hover:border-[#174D35] transition-all flex flex-col justify-between agri-card-shadow group"
                  >
                    <div>
                      {/* Machine Thumbnail */}
                      <div 
                        className="relative h-48 bg-neutral-200 overflow-hidden cursor-pointer" 
                        onClick={() => setInspectedEquipment(item)}
                      >
                        <img
                          src={getEquipmentDisplayImage(item)}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Availability and verification badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold shadow-sm ${
                            item.availability === 'Available'
                              ? 'bg-[#174D35] text-white'
                              : item.availability === 'Active rental'
                              ? 'bg-[#E6A23C] text-[#103B2A]'
                              : 'bg-neutral-600 text-white'
                          }`}>
                            {item.availability}
                          </span>
                          <span className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold bg-white/95 text-[#103B2A] shadow-sm">
                            Verified Asset
                          </span>
                        </div>

                        {/* Wishlist Heart Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite?.(item.id);
                          }}
                          aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
                          className="absolute top-3 right-3 min-h-[44px] min-w-[44px] rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md text-[#202820] hover:text-[#E6A23C] transition-all z-10"
                        >
                          <Heart 
                            className={`w-4 h-4 transition-colors ${
                              isSaved ? 'fill-red-500 text-red-500' : 'text-[#202820]'
                            }`} 
                          />
                        </button>

                        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-[4px] bg-black/70 text-white text-[11px] font-mono">
                          {equipmentDistances[item.id] !== undefined && equipmentDistances[item.id] !== null
                            ? `${equipmentDistances[item.id]} km`
                            : 'Distance unavailable'}
                        </div>
                      </div>

                      {/* Machine Details */}
                      <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#202820]/70">
                        <span className="font-semibold text-[#174D35] uppercase tracking-wider text-[11px]">
                          {item.category}
                        </span>
                        <span className="text-[11px] font-mono text-[#202820]/60">
                          {item.specs.fuelType}
                        </span>
                      </div>

                      <h3 
                        onClick={() => setInspectedEquipment(item)}
                        className="text-base font-bold text-[#103B2A] hover:text-[#174D35] cursor-pointer transition-colors leading-snug line-clamp-1"
                      >
                        {item.title}
                      </h3>

                      {/* Location: State & LGA */}
                      <p className="text-xs text-[#202820]/70 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#174D35]/70 shrink-0" />
                        <span className="font-medium text-[#103B2A]">{item.locationLGA}, {item.locationState}</span>
                      </p>

                      <p className="text-xs text-[#202820]/70 line-clamp-2 leading-relaxed pt-1">
                        {item.description}
                      </p>
                      <p className="text-[11px] text-[#174D35] font-semibold">{item.quantityInStock || 1} in stock · {item.specs.condition}</p>

                      <div className="pt-2 border-t border-[#DCE9DE] flex items-center justify-between text-xs text-[#202820]/70">
                        <span className="truncate max-w-[170px]">
                          By: <strong className="text-[#103B2A]">{item.ownerName}</strong>
                        </span>
                        <button
                          onClick={() => setInspectedEquipment(item)}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-end text-[#174D35] font-semibold hover:underline gap-1 text-[11px]"
                        >
                          <Info className="w-3.5 h-3.5" />
                          Specs
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom CTA with min 44px tap target */}
                  <div className="p-4 pt-3 border-t border-[#DCE9DE] flex items-center justify-between bg-[#F7F8F4]/50">
                    <div>
                      <span className="text-base font-bold text-[#174D35] font-mono">
                        {formatNaira(item.dailyRate)}
                      </span>
                      <span className="text-[11px] text-[#202820]/60"> / day</span>
                    </div>

                    <button
                      onClick={() => onSelectEquipmentForBooking(item)}
                      className="min-h-[44px] px-4 py-2 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-semibold rounded-[8px] transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Rent Now</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#E6A23C]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          </main>
        </div>
      </div>

      {/* Equipment Detailed Specs Modal */}
      {inspectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[16px] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 border border-[#DCE9DE] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#DCE9DE] pb-3">
              <div>
                <span className="text-[11px] font-semibold uppercase text-[#174D35] tracking-wider">
                  Technical Specifications
                </span>
                <h3 className="text-lg font-bold text-[#103B2A] mt-0.5">
                  {inspectedEquipment.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectedEquipment(null)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-44 rounded-[10px] overflow-hidden bg-neutral-100">
              <img
                src={getEquipmentDisplayImage(inspectedEquipment)}
                alt={inspectedEquipment.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#F7F8F4] p-3 rounded-[10px] border border-[#DCE9DE]">
                <div>
                  <span className="text-[#202820]/60 block text-[11px]">Horsepower:</span>
                  <span className="font-bold text-[#103B2A] font-mono">{inspectedEquipment.horsepower} HP</span>
                </div>
                <div>
                  <span className="text-[#202820]/60 block text-[11px]">Daily Rate:</span>
                  <span className="font-bold text-[#174D35] font-mono">{formatNaira(inspectedEquipment.dailyRate)}</span>
                </div>
                <div>
                  <span className="text-[#202820]/60 block text-[11px]">Hub Location:</span>
                  <span className="font-bold text-[#103B2A]">{inspectedEquipment.locationLGA}, {inspectedEquipment.locationState}</span>
                </div>
                <div>
                  <span className="text-[#202820]/60 block text-[11px]">Availability:</span>
                  <span className="font-semibold text-green-700">{inspectedEquipment.availability}</span>
                </div>
                <div>
                  <span className="text-[#202820]/60 block text-[11px]">Units in stock:</span>
                  <span className="font-bold text-[#103B2A]">{inspectedEquipment.quantityInStock || 1}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#103B2A] mb-1">Equipment Description</h4>
                <p className="text-[#202820]/80 leading-relaxed">
                  {inspectedEquipment.description}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#103B2A] mb-1">Implement &amp; Condition Details</h4>
                <ul className="space-y-1 text-[#202820]/80">
                  <li>&bull; Working Width: <strong>{inspectedEquipment.specs.workingWidth || 'Standard 3-pt hookup'}</strong></li>
                  <li>&bull; Condition: <strong>{inspectedEquipment.specs.condition}</strong></li>
                  <li>&bull; Fuel &amp; Drive: <strong>{inspectedEquipment.specs.fuelType}</strong></li>
                  <li>&bull; Payment &amp; insurance integrations are not active in this showcase.</li>
                </ul>
              </div>

              {inspectedEquipment.healthNotes && (
                <div className="p-3 bg-amber-50 rounded-[8px] border border-amber-200 text-amber-900">
                  <span className="font-bold block text-[11px]">Maintenance &amp; Inspection Note:</span>
                  <p className="text-[11px] mt-0.5">{inspectedEquipment.healthNotes}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#DCE9DE] flex items-center justify-end gap-3">
              <button
                onClick={() => setInspectedEquipment(null)}
                className="min-h-[44px] px-4 py-2 border border-[#DCE9DE] text-xs font-semibold text-[#103B2A] rounded-[8px] hover:bg-[#F7F8F4]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const equip = inspectedEquipment;
                  setInspectedEquipment(null);
                  onSelectEquipmentForBooking(equip);
                }}
                className="min-h-[44px] px-5 py-2 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-semibold rounded-[8px] shadow-sm flex items-center gap-1.5"
              >
                <span>Book This Machine</span>
                <ArrowRight className="w-4 h-4 text-[#E6A23C]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
