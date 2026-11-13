import { Equipment, EquipmentCategory } from '../types';

export const EQUIPMENT_CATEGORY_TEMPLATE_IMAGES: Partial<Record<EquipmentCategory, string>> = {
  Irrigation: '/src/assets/images/agri_irrigation_template.jpg',
  Planters: '/src/assets/images/agri_planter_template.jpg',
  Trailers: '/src/assets/images/agri_trailer_template.jpg',
  Sprayers: '/src/assets/images/agri_sprayer_template.jpg',
  Seeders: '/src/assets/images/agri_seeder_template.jpg',
  Balers: '/src/assets/images/agri_baler_template.jpg',
  Tillers: '/src/assets/images/agri_rotary_tiller_template.jpg',
  Cultivators: '/src/assets/images/agri_rotary_tiller_template.jpg',
  Shellers: '/src/assets/images/agri_sheller_template.jpg',
};

const genericSeedImages = [
  'agri_tractor_field_1794305594217.jpg',
  'agri_combine_harvester_1794305594321.jpg',
  'agri_rotary_tiller_1794305596130.jpg',
];

export function getEquipmentDisplayImage(equipment: Equipment): string {
  const template = EQUIPMENT_CATEGORY_TEMPLATE_IMAGES[equipment.category];
  const isGenericSeedImage = genericSeedImages.some(image => equipment.imageUrl.endsWith(image));
  return template && (!equipment.imageUrl || isGenericSeedImage)
    ? template
    : equipment.imageUrl || template || '/src/assets/images/agri_tractor_field_1794305594217.jpg';
}
