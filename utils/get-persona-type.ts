import { PersonaType } from '@/types/persona.types';

const PERSONA_PRIORITY = ['s', 'c', 'f'] as const;

export const getPersonaType = (source: (keyof typeof PersonaType)[]): string => {
  for (const key of PERSONA_PRIORITY) {
    if (source.includes(key)) {
      return PersonaType[key];
    }
  }

  return '';
};
