export type EquipmentCategory = 
  | 'Tractors' 
  | 'Harvesters' 
  | 'Irrigation' 
  | 'Tillers' 
  | 'Planters' 
  | 'Trailers'
  | 'Ploughs'
  | 'Sprayers'
  | 'Seeders'
  | 'Threshers'
  | 'Balers'
  | 'Cultivators'
  | 'Shellers';

export type AvailabilityStatus = 'Available' | 'Active rental' | 'Maintenance';

export interface Equipment {
  id: string;
  title: string;
  category: EquipmentCategory;
  dailyRate: number; // in Naira
  locationState: string;
  locationLGA: string;
  distanceKm?: number;
  quantityInStock?: number;
  horsepower: number;
  ownerName: string;
  ownerRating: number;
  ownerReviewCount: number;
  verified: boolean;
  imageUrl: string;
  availability: AvailabilityStatus;
  nextBookingSchedule?: string;
  novemberEarnings?: number;
  healthNotes?: string;
  description: string;
  specs: {
    fuelType: string;
    workingWidth?: string;
    condition: string;
    insuranceProtected: boolean;
  };
  isFavorite?: boolean;
}

export type DeliveryMethod = 'delivery' | 'pickup';
export type PaymentMethod = 'opay' | 'verve' | 'transfer';
export type BookingStatus = 'Pending Approval' | 'Accepted' | 'Declined' | 'Cancelled' | 'Completed';

export interface Booking {
  id: string;
  equipmentId: string;
  equipmentTitle: string;
  equipmentImage: string;
  category: EquipmentCategory;
  farmerName: string;
  farmerPhone: string;
  farmAddress: string;
  state: string;
  lga: string;
  startDate: string;
  endDate: string;
  days: number;
  dailyRate: number;
  subtotal: number;
  deliveryFee: number;
  serviceInsuranceFee: number;
  harvestDiscount: number;
  totalAmount: number;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  status: BookingStatus;
  demoReference: string;
  driverName?: string;
  driverPhone?: string;
  preCheckCompleted: boolean;
  createdAt: string;
  completedAt?: string;
  farmerRating?: number;
  farmerReview?: string;
  ratedAt?: string;
}

export interface RentalRequest {
  id: string;
  equipmentId: string;
  equipmentTitle: string;
  farmerName: string;
  farmerLocation: string;
  startDate: string;
  endDate: string;
  days: number;
  totalPayout: number;
  farmSizeHectares: number;
  cropType: string;
  status: 'pending' | 'accepted' | 'declined';
  requestTimestamp: string;
  bookingId?: string;
}

export interface ActivityLogItem {
  id: string;
  userId?: string;
  timestamp: string;
  action: string;
  category: 'rental' | 'wishlist' | 'fleet' | 'account' | 'auth';
  details: string;
  status: 'completed' | 'pending' | 'info';
  metadata?: Record<string, any>;
}

export interface UserSettings {
  smsAlerts: boolean;
  whatsAppAlerts: boolean;
  emailReceipts: boolean;
  searchRadiusKm: number;
  payoutAccount?: string;
  payoutBank?: string;
  twoFactorAuth: boolean;
}

export type FarmSeasonType = 'Wet season' | 'Dry season';
export type FarmTaskStatus = 'upcoming' | 'completed' | 'overdue';

export interface FarmPlot {
  id: string;
  name: string;
  hectares: number;
  crop: string;
  notes: string;
}

export interface CropPlan {
  id: string;
  crop: string;
  plotId: string;
  plantingDate: string;
  expectedHarvestDate: string;
  stage: string;
}

export interface FarmTask {
  id: string;
  title: string;
  plotId: string;
  dueDate: string;
  time?: string;
  status: FarmTaskStatus;
  notes: string;
}

export interface FarmCost {
  id: string;
  category: 'Seeds' | 'Fertilizer' | 'Chemicals' | 'Labour' | 'Fuel' | 'Transport' | 'Machinery' | 'Other';
  description: string;
  amount: number;
  date: string;
  plotId: string;
  notes: string;
}

export interface FarmActivityRecord {
  id: string;
  activity: string;
  date: string;
  plotId: string;
  notes: string;
}

export interface FarmManagement {
  seasonName: string;
  seasonType: FarmSeasonType;
  startDate: string;
  expectedEndDate: string;
  plots: FarmPlot[];
  cropPlans: CropPlan[];
  tasks: FarmTask[];
  costs: FarmCost[];
  activities: FarmActivityRecord[];
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'farmer' | 'owner';
  location: string;
  state?: string;
  lga?: string;
  farmSizeHectares?: number;
  fleetCount?: number;
  verified: boolean;
  settings?: UserSettings;
  savedEquipmentIds?: string[];
  hasDualRole?: boolean;
  isDemo?: boolean;
  onboardingCompleted?: boolean;
  farmManagement?: FarmManagement;
}


