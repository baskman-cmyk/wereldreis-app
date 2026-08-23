export type TabType = string;

export interface StoredPdf {
  id?: string;
  name: string;
  size: number;
  type?: string;
  /** Reference to the actual file blob stored in IndexedDB (see src/utils/fileStore.ts). Preferred storage location for new files. */
  fileId?: string;
  /**
   * @deprecated Legacy inline Base64 data URL. Only present on data imported before v2.19.0, when
   * files were stored inline in localStorage. Migrated to IndexedDB (and `fileId`) on first load.
   */
  dataUrl?: string;
  uploadedAt: string;
  url?: string;
  dateAdded?: string;
  [key: string]: any;
}

export interface GPSLocation {
  lat: number;
  lng: number;
  label?: string;
  [key: string]: any;
}

export interface SavedLocation {
  id: string;
  name?: string;
  title?: string;
  type?: string;
  category?: string;
  country?: string;
  city?: string;
  address?: string;
  description?: string;
  gps?: GPSLocation;
  lat?: number;
  lng?: number;
  website?: string;
  notes?: string;
  [key: string]: any;
}

export interface WeatherDay {
  date?: string;
  dayName?: string;
  tempMax?: number;
  tempMin?: number;
  condition?: string;
  icon?: string;
  uvIndex?: number;
  rainChance?: number;
  [key: string]: any;
}

export interface WeatherInfo {
  currentTemp?: number;
  condition?: string;
  humidity?: number;
  windKmh?: number;
  uvIndex?: number;
  rainChance?: number;
  sunrise?: string;
  sunset?: string;
  forecast14Days?: WeatherDay[];
  [key: string]: any;
}

export interface TripOverview {
  title: string;
  familyTitle?: string;
  tripName?: string;
  startDate: string;
  endDate?: string;
  totalDays?: number;
  currentDay?: number;
  currentCountry?: string;
  currentCity?: string;
  currentGps?: GPSLocation;
  visitedCountriesCount?: number;
  totalKmTraveled?: number;
  totalHikeKm?: number;
  photosCount?: number;
  videosCount?: number;
  nextFlight?: Partial<Flight> & { countdownText?: string };
  weather?: WeatherInfo;
  timezoneDiffHours?: number;
  currencies?: Record<string, number>;
  [key: string]: any;
}

export interface DayPlanItem {
  id?: string;
  startTime?: string;
  endTime?: string;
  time?: string;
  title: string;
  detail?: string;
  description?: string;
  type?: 'activity' | 'transport' | 'flight' | 'accommodation' | 'note' | 'other' | string;
  location?: string;
  travelDuration?: string;
  travelTime?: string;
  distanceKm?: number;
  notes?: string;
  [key: string]: any;
}

export interface ExpenseItem {
  id: string;
  date: string;
  category: string;
  description?: string;
  title?: string;
  amountOriginal?: number;
  currency?: string;
  amountEur: number;
  country?: string;
  paidBy?: string;
  notes?: string;
  [key: string]: any;
}
export interface Expense extends ExpenseItem {}
export interface Transaction extends ExpenseItem {}

export interface TimelineDay {
  id: string;
  dayNumber?: number;
  date: string;
  land?: string;
  country?: string;
  plaats?: string;
  city?: string;
  route?: string;
  routeUrl?: string;
  komootRoutes?: KomootRoute[];
  vervoer?: string;
  afstandKm?: number;
  reistijd?: string;
  distanceKm?: number;
  travelDuration?: string;
  overnachting?: string;
  accommodatieId?: string;
  activiteiten: string[];
  dayPlan?: DayPlanItem[];
  items?: TimelineItem[];
  fotos: string[];
  notities: string;
  uitgaven: ExpenseItem[];
  gps?: GPSLocation;
  samenvatting?: string;
  isCompleted?: boolean;
  accommodationFeatures?: AccommodationFeatures;
  [key: string]: any;
}

export interface KomootRoute {
  id: string;
  title: string;
  url: string;
}

export interface TimelineItem {
  id: string;
  date?: string;
  time?: string;
  title: string;
  type?: string;
  location?: string;
  travelTime?: string;
  travelDuration?: string;
  distanceKm?: number;
  notes?: string;
  status?: string;
  [key: string]: any;
}

export interface Flight {
  id: string;
  airline?: string;
  flightNumber?: string;
  fromCity?: string;
  fromCode?: string;
  toCity?: string;
  toCode?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  departureTime?: string;
  arrivalTime?: string;
  departureDate?: string;
  arrivalDate?: string;
  bookingReference?: string;
  price?: number;
  costEur?: number;
  currency?: string;
  gate?: string;
  terminal?: string;
  seat?: string;
  baggage?: string;
  qrCodeText?: string;
  status?: string;
  delayMinutes?: number;
  ticketPdf?: StoredPdf;
  ticketPdfs?: StoredPdf[];
  pdfUrl?: string;
  [key: string]: any;
}

export interface AccommodationFeatures {
  booked?: boolean;
  cancellable?: boolean;
  cancelable?: boolean;
  paid?: boolean;
  bookedVia?: string;
  breakfast?: boolean;
  kitchen?: boolean;
  pool?: boolean;
  [key: string]: any;
}

export interface Accommodation {
  id: string;
  name: string;
  stad?: string;
  city?: string;
  land?: string;
  country?: string;
  adres?: string;
  address?: string;
  location?: string;
  checkIn: string;
  checkOut: string;
  bookingReference?: string;
  boekingsnummer?: string;
  website?: string;
  price?: number;
  prijsEur?: number;
  costEur?: number;
  currency?: string;
  booked?: boolean;
  paid?: boolean;
  cancelable?: boolean;
  cancellable?: boolean;
  breakfast?: boolean;
  kitchen?: boolean;
  pool?: boolean;
  features?: AccommodationFeatures;
  bookedVia?: string;
  phone?: string;
  telefoon?: string;
  email?: string;
  bijzonderheden?: string;
  wifiCode?: string;
  gps?: GPSLocation;
  lat?: number;
  lng?: number;
  reservationPdf?: StoredPdf;
  reservationPdfs?: StoredPdf[];
  pdfUrl?: string;
  [key: string]: any;
}

export interface CarRentalDetails {
  id?: string;
  company?: string;
  verhuurder?: string;
  model?: string;
  vehicleType?: string;
  kenteken?: string;
  transmission?: string;
  fuelType?: string;
  fuelPolicy?: string;
  seats?: number;
  pickupLocation?: string;
  ophaallocatie?: string;
  pickupDate?: string;
  ophaaldatum?: string;
  pickupTime?: string;
  dropoffLocation?: string;
  returnLocation?: string;
  inleverlocatie?: string;
  dropoffDate?: string;
  returnDate?: string;
  inleverdatum?: string;
  returnTime?: string;
  bookingReference?: string;
  totalPrice?: number;
  price?: number;
  dagprijsEur?: number;
  currency?: string;
  deposit?: number;
  excess?: number;
  insuranceInfo?: string;
  verzekeringInfo?: string;
  phone?: string;
  website?: string;
  notes?: string;
  contractPdf?: StoredPdf;
  contractPdfs?: StoredPdf[];
  insurancePdf?: StoredPdf;
  insurancePdfs?: StoredPdf[];
  [key: string]: any;
}

export interface CamperDetails {
  carOption: CarRentalDetails;
  carRentals?: CarRentalDetails[];
  tankLevels: Record<string, any>;
  [key: string]: any;
}

export interface ActivityItem {
  id: string;
  title?: string;
  name?: string;
  datum?: string;
  date?: string;
  tijd?: string;
  time?: string;
  endTime?: string;
  location?: string;
  plaats?: string;
  land?: string;
  country?: string;
  price?: number;
  priceEur?: number;
  kostenEur?: number;
  currency?: string;
  booked?: boolean;
  geboekt?: boolean;
  paid?: boolean;
  betaald?: boolean;
  website?: string;
  bookingReference?: string;
  boekingsnummer?: string;
  ticketPdf?: StoredPdf;
  ticketPdfs?: StoredPdf[];
  pdfUrl?: string;
  category?: string;
  notes?: string;
  description?: string;
  address?: string;
  [key: string]: any;
}

export interface PackingItem {
  id: string;
  item: string;
  text?: string;
  category?: string;
  categorie?: string;
  subcategory?: string;
  subcategorie?: string;
  toegewezenAan?: string;
  person?: string;
  personId?: string;
  status: string;
  completed?: boolean;
  notes?: string;
  [key: string]: any;
}

export interface PackingPerson {
  id: string;
  name: string;
  color?: string;
  kind?: 'person' | 'general' | 'children';
}

export interface ChecklistItem {
  id: string;
  title?: string;
  taak?: string;
  description?: string;
  land?: string;
  country?: string;
  phase?: string;
  fase?: string;
  category?: string;
  status?: string;
  completed?: boolean;
  deadline?: string;
  notes?: string;
  [key: string]: any;
}

export interface DocumentItem {
  id: string;
  type?: string;
  title?: string;
  naam?: string;
  person?: string;
  persoon?: string;
  number?: string;
  nummer?: string;
  validUntil?: string;
  geldigTot?: string;
  issuer?: string;
  notes?: string;
  pdf?: StoredPdf;
  attachment?: StoredPdf;
  [key: string]: any;
}

export type HealthEntryCategory = 'vaccination' | 'allergy' | 'medicine' | 'supplement';

export interface HealthEntry {
  id: string;
  category: HealthEntryCategory;
  title: string;
  details?: string;
  document?: StoredPdf;
  completed?: boolean;
}

export interface FamilyMember {
  id: string;
  name?: string;
  naam?: string;
  birthDate?: string;
  role?: string;
  bloodType?: string;
  allergies?: string[] | string;
  medication?: string[] | string;
  passportNumber?: string;
  nationality?: string;
  notes?: string;
  pdfUrl?: string;
  passportPdf?: StoredPdf;
  healthEntries?: HealthEntry[];
  [key: string]: any;
}

export interface EmergencyProfile {
  familyMembers?: FamilyMember[];
  contactName?: string;
  contactPhone?: string;
  doctorName?: string;
  doctorPhone?: string;
  insurer?: string;
  policyNumber?: string;
  emergencyPhone?: string;
  allergies?: string;
  medication?: string;
  medicalNotes?: string;
  carRentalCompany?: string;
  carContractNumber?: string;
  roadsideAssistancePhone?: string;
  globalInsurance?: string;
  embassyContact?: string;
  insurancePdf?: StoredPdf;
  rentalPdf?: StoredPdf;
  [key: string]: any;
}

export interface EmergencyCountryProfile {
  id: string;
  country: string;
  flag?: string;
  generalEmergency?: string;
  police?: string;
  ambulance?: string;
  fireDepartment?: string;
  touristPolice?: string;
  embassyName?: string;
  embassyPhone?: string;
  nearestHospital?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  insurerEmergencyPhone?: string;
  roadsideAssistancePhone?: string;
  netherlandsWorldwide?: string;
  medicalHelp?: string;
  specialIsis?: string;
  czHelpline?: string;
  important?: string;
  notes?: string;
  [key: string]: any;
}

export interface JournalEntry {
  id: string;
  date?: string;
  datum?: string;
  title?: string;
  text?: string;
  content?: string;
  mood?: string;
  location?: string;
  photos?: string[];
  [key: string]: any;
}

export interface PhotoItem {
  id: string;
  date?: string;
  /** External image URL. Empty for locally uploaded photos (see `fileId`). */
  url: string;
  /** Reference to the actual image blob stored in IndexedDB (see src/utils/fileStore.ts). */
  fileId?: string;
  /**
   * @deprecated Legacy inline Base64 data URL. Only present on data imported before v2.19.0.
   * Migrated to IndexedDB (and `fileId`) on first load.
   */
  dataUrl?: string;
  caption?: string;
  location?: string;
  tags?: string[];
  [key: string]: any;
}

export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  type?: string;
  date?: string;
  read: boolean;
  [key: string]: any;
}

export interface CategoryBudget {
  id?: string;
  category: string;
  label?: string;
  budgetEur: number;
  spentEur: number;
  iconName?: string;
  sourceLines?: BudgetDashboardLine[];
  [key: string]: any;
}
export interface BudgetCategory extends CategoryBudget {
  name?: string;
  spent?: number;
  limit?: number;
}

export interface BudgetDashboardLine {
  id?: string;
  label: string;
  amount?: number;
  amountEur?: number;
  section?: string;
  source?: string;
  country?: string;
  category?: string;
  kind?: 'planned' | 'actual';
  type?: 'budget' | 'actual' | string;
  [key: string]: any;
}

export interface BudgetCategoryGroup {
  category: string;
  label: string;
  plannedEur: number;
  actualEur: number;
  sourceLines: BudgetDashboardLine[];
}

export interface CountryDailyBudget {
  country: string;
  days: number;
  dailyBudgetEur: number;
  totalEur: number;
}

export interface CountryBudgetGroup {
  country: string;
  days: number;
  dailyBudgetEur: number;
  plannedEur: number;
  actualEur: number;
  categories: BudgetCategoryGroup[];
}

export interface BudgetDashboardData {
  homeCostsEur?: number;
  upfrontCostsEur?: number;
  travelCostsEur?: number;
  contingencyEur?: number;
  totalNeededEur?: number;
  alreadyPaidEur?: number;
  fundingTotalEur?: number;
  fundingDifferenceEur?: number;
  paidBreakdown?: Array<{ label: string; amountEur: number }>;
  monthlyIncomeEur?: number;
  fundingLines?: Array<{ label: string; amountEur: number; source?: string }>;
  incomeLines?: Array<{ label: string; amountEur: number; source?: string }>;
  countryDailyBudgets?: CountryDailyBudget[];
  countryGroups?: CountryBudgetGroup[];
  globalCategoryGroups?: BudgetCategoryGroup[];
  sourceSheet?: string;
  totalNeeded?: number;
  totalAvailable?: number;
  totalPaid?: number;
  totalSpent?: number;
  remaining?: number;
  homeCosts?: number;
  preTripCosts?: number;
  travelCosts?: number;
  contingency?: number;
  funding?: number;
  lines?: BudgetDashboardLine[];
  countryBudgets?: Array<Record<string, any>>;
  [key: string]: any;
}
export interface BudgetDashboard extends BudgetDashboardData {
  totalBudget?: number;
}

export interface CountryPlan {
  id?: string;
  name?: string;
  land?: string;
  country?: string;
  flag?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  budgetPerDay?: number;
  totalBudget?: number;
  color?: string;
  [key: string]: any;
}

export interface MapLocation extends SavedLocation {}

export interface ImportCandidateData {
  name: string;
  bookingNumber?: string;
  price?: number;
  currency?: string;
  address?: string;
  dates: { start?: string; end?: string };
  [key: string]: any;
}

export interface ImportCandidate {
  id: string;
  type: 'flight' | 'accommodation' | 'rental' | string;
  isSelected: boolean;
  data: ImportCandidateData;
  warnings: string[];
  source?: string;
  rawText?: string;
  selected?: boolean;
  title?: string;
  category?: string;
  date?: string;
  price?: number;
  bookingReference?: string;
  [key: string]: any;
}

export interface TripDataState {
  overview: TripOverview;
  timeline: TimelineDay[];
  countries: CountryPlan[];
  countryPlans?: CountryPlan[];
  flights: Flight[];
  accommodations: Accommodation[];
  activities: ActivityItem[];
  camper: CamperDetails;
  carRentals?: CarRentalDetails[];
  packingItems: PackingItem[];
  packingPeople?: PackingPerson[];
  checklists: ChecklistItem[];
  documents: DocumentItem[];
  budgetExpenses: ExpenseItem[];
  categoryBudgets: CategoryBudget[];
  budgetDashboard?: BudgetDashboardData;
  familyMembers: FamilyMember[];
  emergencyProfile?: EmergencyProfile;
  emergencies?: EmergencyCountryProfile[];
  journals: JournalEntry[];
  photos: PhotoItem[];
  notifications: NotificationItem[];
  savedLocations: SavedLocation[];
  hikes: any[];
  weatherForecasts?: WeatherInfo[];
  widgetsConfig: Array<{ id: string; title: string; enabled: boolean; [key: string]: any }>;
  [key: string]: any;
}
