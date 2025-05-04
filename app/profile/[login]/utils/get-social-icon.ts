import { FaMastodon } from 'react-icons/fa';
import { FaBluesky, FaXTwitter, FaInstagram, FaLinkedinIn, FaStackOverflow } from 'react-icons/fa6';
import { IoShareSocialOutline } from 'react-icons/io5';

export const getSocialIcon = (provider: string) => {
  switch (provider) {
    case 'TWITTER':
      return FaXTwitter;
    case 'MASTODON':
      return FaMastodon;
    case 'BLUESKY':
      return FaBluesky;
    case 'INSTAGRAM':
      return FaInstagram;
    case 'LINKEDIN':
      return FaLinkedinIn;
    case 'STACKOVERFLOW':
      return FaStackOverflow;
    case 'GENERIC':
    default:
      return IoShareSocialOutline;
  }
};
