import { FaMastodon, FaTwitch, FaYoutube } from 'react-icons/fa';
import {
  FaBluesky,
  FaGithub,
  FaGitlab,
  FaInstagram,
  FaLinkedinIn,
  FaNpm,
  FaStackOverflow,
  FaXTwitter,
} from 'react-icons/fa6';
import { IoShareSocialOutline } from 'react-icons/io5';
import { SiBinance } from 'react-icons/si';

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

      if (url.indexOf('youtube.com') > -1) {
        return FaYoutube;
      }

      if (url.indexOf('binance.com') > -1) {
        return SiBinance;
      }

      if (url.indexOf('twitch.tv') > -1) {
        return FaTwitch;
      }

      if (url.indexOf('gitlab.com') > -1) {
        return FaGitlab;
      }

      if (url.indexOf('github.com') > -1) {
        return FaGithub;
      }

      return IoShareSocialOutline;
    }
  }
};
