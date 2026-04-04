import { useState, useMemo, useCallback } from 'react';
import type { CrewMember, Recommendation } from '../types';
import { defaultCrew } from '../constants';
import { getActiveCrew, recommendWatchSystem } from '../utils/schedule-logic';

export interface CrewManagementReturn {
  crew: CrewMember[];
  setCrew: React.Dispatch<React.SetStateAction<CrewMember[]>>;
  newCrewName: string;
  setNewCrewName: (name: string) => void;
  newCrewRole: string;
  setNewCrewRole: (role: string) => void;
  captainParticipates: boolean;
  setCaptainParticipates: (v: boolean) => void;
  activeCrew: CrewMember[];
  recommendations: Recommendation[];
  addCrew: () => void;
  removeCrew: (id: string) => void;
}

export function useCrewManagement(): CrewManagementReturn {
  const [crew, setCrew] = useState<CrewMember[]>(defaultCrew);
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewRole, setNewCrewRole] = useState('sailor');
  const [captainParticipates, setCaptainParticipates] = useState(true);

  const activeCrew = useMemo(
    () => getActiveCrew(crew, captainParticipates),
    [crew, captainParticipates],
  );

  const recommendations = useMemo(() => {
    if (activeCrew.length > 0) {
      return recommendWatchSystem(crew, captainParticipates);
    }
    return [];
  }, [crew, captainParticipates, activeCrew]);

  const addCrew = useCallback(() => {
    if (newCrewName.trim() && crew.length < 15) {
      setCrew((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2, 11),
          name: newCrewName.trim(),
          role: newCrewRole,
        },
      ]);
      setNewCrewName('');
    }
  }, [newCrewName, newCrewRole, crew.length]);

  const removeCrew = useCallback(
    (id: string) => {
      if (crew.length > 3) {
        setCrew((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert('Minimalna liczba załogi to 3 osoby.');
      }
    },
    [crew.length],
  );

  return {
    crew,
    setCrew,
    newCrewName,
    setNewCrewName,
    newCrewRole,
    setNewCrewRole,
    captainParticipates,
    setCaptainParticipates,
    activeCrew,
    recommendations,
    addCrew,
    removeCrew,
  };
}
