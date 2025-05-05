import { FaMastodon } from 'react-icons/fa';
import { FaBluesky, FaXTwitter, FaInstagram, FaLinkedinIn, FaStackOverflow, FaNpm } from 'react-icons/fa6';
import { IoShareSocialOutline } from 'react-icons/io5';

export const getSocialIcon = (provider: string, url: string = '') => {
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
    case 'GENERIC':
    default: {
      if (url.indexOf('npmjs.com') > -1) {
        return FaNpm;
      }

      if (url.indexOf('stackoverflow.com') > -1) {
        return FaStackOverflow;
      }

      return IoShareSocialOutline;
    }
  }
};
