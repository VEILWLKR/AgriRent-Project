import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Tractor, 
  AlertCircle,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Equipment, EquipmentCategory } from '../types';
import { sanitizeInput } from '../utils/security';
import { EQUIPMENT_CATEGORY_TEMPLATE_IMAGES as templateImages, getEquipmentDisplayImage } from '../utils/equipmentImages';

interface AddEquipmentModalProps {
  onClose: () => void;
  onAddEquipment: (newEquip: Equipment) => Promise<void>;
  ownerName: string;
  initialEquipment?: Equipment | null;
}

export const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({
  onClose,
  onAddEquipment,
  ownerName,
  initialEquipment,
}) => {
  const [title, setTitle] = useState<string>(initialEquipment?.title || '');
  const [category, setCategory] = useState<EquipmentCategory>(initialEquipment?.category || 'Tractors');
  const [imageUrl, setImageUrl] = useState<string>(initialEquipment ? getEquipmentDisplayImage(initialEquipment) : templateImages.Tractors);
  const [dailyRate, setDailyRate] = useState<number | ''>(initialEquipment?.dailyRate || '');
  const [locationState, setLocationState] = useState<string>(initialEquipment?.locationState || '');
  const [locationLGA, setLocationLGA] = useState<string>(initialEquipment?.locationLGA || '');
  const [horsepower, setHorsepower] = useState<number | ''>(initialEquipment?.horsepower ?? '');
  const [quantityInStock, setQuantityInStock] = useState<number>(initialEquipment?.quantityInStock ?? 1);
  const [description, setDescription] = useState<string>(initialEquipment?.description || '');
  const [fuelType, setFuelType] = useState<string>(initialEquipment?.specs.fuelType || '');
  const [condition, setCondition] = useState<string>(initialEquipment?.specs.condition || '');
  const [healthNotes, setHealthNotes] = useState<string>(initialEquipment?.healthNotes || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Machine title is required');
      return;
    }
    if (!dailyRate || dailyRate <= 0) {
      setError('Please provide a valid daily rate in Naira');
      return;
    }

    const newEquipment: Equipment = {
      id: initialEquipment?.id || `eq-${Date.now()}`,
      title: sanitizeInput(title),
      category,
      dailyRate: Number(dailyRate),
      locationState,
      locationLGA: sanitizeInput(locationLGA),
      distanceKm: initialEquipment?.distanceKm,
      horsepower: Number(horsepower),
      quantityInStock: Math.max(1, Math.floor(quantityInStock || 1)),
      ownerName,
      ownerRating: initialEquipment?.ownerRating || 0,
      ownerReviewCount: initialEquipment?.ownerReviewCount || 0,
      verified: false,
      imageUrl,
      availability: initialEquipment?.availability || 'Available',
      nextBookingSchedule: initialEquipment?.nextBookingSchedule || 'Available for immediate dispatch',
      novemberEarnings: initialEquipment?.novemberEarnings || 0,
      healthNotes: sanitizeInput(healthNotes),
      description: sanitizeInput(description),
      specs: {
        fuelType,
        workingWidth: initialEquipment?.specs.workingWidth,
        condition: condition || 'Not inspected',
        insuranceProtected: initialEquipment?.specs.insuranceProtected || false,
      },
    };

    try {
      await onAddEquipment(newEquipment);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not publish equipment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[16px] max-w-xl w-full border border-[#DCE9DE] agri-elevated-shadow p-6 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#DCE9DE]">
          <div className="w-10 h-10 rounded-[8px] bg-[#174D35] text-white flex items-center justify-center">
            <Tractor className="w-5 h-5 text-[#E6A23C]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#103B2A]">
              {initialEquipment ? 'Edit Machinery Listing' : 'Register New Machinery Asset'}
            </h3>
            <p className="text-xs text-[#202820]/70">
              Add equipment to the showcase marketplace. New listings are not independently verified.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[8px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#103B2A] mb-1">
              Equipment Make & Model
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. John Deere 5075E 4WD"
              className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const nextCategory = e.target.value as EquipmentCategory;
                  setCategory(nextCategory);
                  setImageUrl(templateImages[nextCategory]);
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
              >
                <option value="Tractors">Tractors</option>
                <option value="Harvesters">Harvesters</option>
                <option value="Tillers">Tillers & Rotavators</option>
                <option value="Planters">Planters</option>
                <option value="Irrigation">Irrigation Pumps</option>
                <option value="Trailers">Grain Trailers</option>
                <option value="Ploughs">Ploughs</option>
                <option value="Sprayers">Sprayers</option>
                <option value="Seeders">Seeders</option>
                <option value="Threshers">Threshers</option>
                <option value="Balers">Balers</option>
                <option value="Cultivators">Cultivators</option>
                <option value="Shellers">Shellers</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                Horsepower (HP)
              </label>
              <input
                type="number"
                value={horsepower}
                onChange={(e) => setHorsepower(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#103B2A] mb-1">Number in stock</label>
              <input type="number" min="1" step="1" value={quantityInStock} onChange={event => setQuantityInStock(Math.max(1, Number(event.target.value) || 1))} className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]" />
              <p className="text-[10px] text-[#202820]/55 mt-1">List identical machines under one listing.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#103B2A] mb-1">Fuel type</label>
              <select value={fuelType} onChange={event => setFuelType(event.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"><option value="">Select fuel type</option><option>Diesel</option><option>Petrol</option><option>Electric</option><option>PTO driven</option><option>Hydraulic</option><option>Manual / non-powered</option></select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#103B2A] mb-1">Equipment condition</label>
            <select value={condition} onChange={event => setCondition(event.target.value)} className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"><option value="">Select condition</option>{condition && !['Excellent', 'Good', 'Fair', 'Needs maintenance', 'Not inspected'].includes(condition) && <option value={condition}>{condition}</option>}<option>Excellent</option><option>Good</option><option>Fair</option><option>Needs maintenance</option><option>Not inspected</option></select>
          </div>

          <div className="rounded-xl border border-[#DCE9DE] bg-[#F7F8F4] p-3 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#174D35]" />
              <div>
                <p className="text-xs font-bold text-[#103B2A]">Equipment picture</p>
                <p className="text-[11px] text-[#202820]/60">Choose a category template or upload your own photo.</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => setImageUrl(templateImages[category])} className={`w-20 h-14 rounded-lg overflow-hidden border-2 ${imageUrl === templateImages[category] ? 'border-[#E6A23C]' : 'border-transparent'}`}>
                <img src={templateImages[category]} alt={`${category} template`} className="w-full h-full object-cover" />
              </button>
              <label className="w-20 h-14 rounded-lg border border-dashed border-[#174D35] bg-white flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-[#174D35] cursor-pointer">
                <Upload className="w-4 h-4" />
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith('image/')) {
                      setError('Please choose an image file.');
                      return;
                    }
                    if (file.size > 1_000_000) {
                      setError('Please choose an image smaller than 1 MB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setImageUrl(String(reader.result));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
            <img src={imageUrl} alt="Selected equipment preview" className="w-full h-36 rounded-lg object-cover border border-[#DCE9DE]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                Daily Rental Rate (₦ Naira)
              </label>
              <input
                type="number"
                step="1000"
                value={dailyRate}
                onChange={(e) => setDailyRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] font-mono focus:outline-none focus:border-[#174D35]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                Operating State
              </label>
              <select
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"
              >
                <option>Oyo State</option>
                <option>Ogun State</option>
                <option>Ondo State</option>
                <option>Osun State</option>
                <option>Lagos State</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#103B2A] mb-1">
              Local Govt Area (LGA) / Depot Location
            </label>
            <input
              type="text"
              value={locationLGA}
              onChange={(e) => setLocationLGA(e.target.value)}
              placeholder="e.g. Ibadan South-West"
              className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#103B2A] mb-1">
              Technical Description & Recommended Field Work
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#103B2A] mb-1">
              Recent Maintenance & Health Notes
            </label>
            <input
              type="text"
              value={healthNotes}
              onChange={(e) => setHealthNotes(e.target.value)}
              placeholder="e.g. Hydraulic oil changed, tyres 95% tread"
              className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"
            />
          </div>

          <div className="pt-3 border-t border-[#DCE9DE] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#DCE9DE] text-xs font-semibold text-[#202820] rounded-[8px] hover:bg-[#F7F8F4]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-bold rounded-[8px] flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4 text-[#E6A23C]" />
              <span>{initialEquipment ? 'Save Listing Changes' : 'Publish Machinery to Fleet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
