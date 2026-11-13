import heroSingaporeCare from '../assets/images/hero_singapore_care_1794554783056.jpg';
import sitterMeilin from '../assets/images/sitter_portrait_meilin_1794554783316.jpg';
import sitterAishah from '../assets/images/sitter_portrait_aishah_1794554783620.jpg';
import sitterPriya from '../assets/images/sitter_portrait_priya_1794554784232.jpg';
import sitterClaire from '../assets/images/sitter_portrait_claire_1794554785282.jpg';

export const HERO_IMAGE_URL = heroSingaporeCare;

const AVATAR_MAP: Record<string, string> = {
  meilin: sitterMeilin,
  aishah: sitterAishah,
  priya: sitterPriya,
  claire: sitterClaire,
};

export function getSitterAvatarUrl(avatarKey: string): string {
  return AVATAR_MAP[avatarKey] || sitterMeilin;
}
