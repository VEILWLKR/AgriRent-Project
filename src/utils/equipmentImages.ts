import type { Equipment, EquipmentCategory } from '../types';

export const EQUIPMENT_IMAGE_URL_PREFIX = '/assets/equipment/';
export const DEFAULT_EQUIPMENT_IMAGE = `${EQUIPMENT_IMAGE_URL_PREFIX}agri_tractor_field_1794305594217.jpg`;
const LEGACY_EQUIPMENT_IMAGE_URL_PREFIX = '/src/assets/images/';

export const EQUIPMENT_CATEGORY_TEMPLATE_IMAGES: Record<EquipmentCategory, string> = {
  Tractors: DEFAULT_EQUIPMENT_IMAGE,
  Harvesters: `${EQUIPMENT_IMAGE_URL_PREFIX}agri_combine_harvester_1794305594321.jpg`,
  Irrigation: `${EQUIPMENT_IMAGE_URL_PREFIX}agri_irrigation_template.jpg`,
  Tillers: `${EQUIPMENT_IMAGE_URL_PREFIX}agri_rotary_tiller_template.jpg`,
  Planters: `${EQUIPMENT_IMAGE_URL_PREFIX}agri_planter_template.jpg`,
  Trailers: `${EQUIPMENT_IMAGE_URL_PREFIX}agri_trailer_template.jpg`,
  Ploughs: `${EQUIPMENT_IMAGE_URL_PREFIX}agri_plough_template.jpg`,
  Sprayers: `${EQUIPMENT_IMAGE_URL_PREFIX}agri_sprayer_template.jpg`,
  Seeders: `${EQUIPMENT_IMAGE_URL_PREFIX}agri_seeder_template.jpg`,
  Threshers: `${EQUIPMENT_IMAGE_URL_PREFIX}agri_thresher_template.jpg`,
  Balers: `${EQUIPMENT_IMAGE_URL_PREFIX}agri_baler_template.jpg`,
  Cultivators: `${EQUIPMENT_IMAGE_URL_PREFIX}agri_cultivator_template.jpg`,
  Shellers: `${EQUIPMENT_IMAGE_URL_PREFIX}agri_sheller_template.jpg`,
};

const genericSeedImages = new Set([
  DEFAULT_EQUIPMENT_IMAGE,
  EQUIPMENT_CATEGORY_TEMPLATE_IMAGES.Harvesters,
  `${EQUIPMENT_IMAGE_URL_PREFIX}agri_rotary_tiller_1794305596130.jpg`,
]);

export function getEquipmentDisplayImage(equipment: Equipment): string {
  const template = EQUIPMENT_CATEGORY_TEMPLATE_IMAGES[equipment.category];
  return !equipment.imageUrl
    || equipment.imageUrl.startsWith(LEGACY_EQUIPMENT_IMAGE_URL_PREFIX)
    || genericSeedImages.has(equipment.imageUrl)
    ? template
    : equipment.imageUrl;
}

export function getBookingDisplayImage(imageUrl?: string): string {
  return !imageUrl || imageUrl.startsWith(LEGACY_EQUIPMENT_IMAGE_URL_PREFIX)
    ? DEFAULT_EQUIPMENT_IMAGE
    : imageUrl;
}
