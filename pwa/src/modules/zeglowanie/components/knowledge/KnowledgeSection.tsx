import React, { Suspense, useState } from 'react';
import { TypeSelector } from '../TypeSelector';

const ShipLightsSection = React.lazy(() => import('./ship-lights/ShipLightsSection'));
const VhfSection = React.lazy(() => import('./vhf/VhfSection'));

type KnowledgeTopic = 'ship-lights' | 'vhf';

const topicOptions = [
  {
    value: 'ship-lights' as KnowledgeTopic,
    emoji: '💡',
    label: 'Światła statków',
    sublabel: 'Sygnalizacja nawigacyjna',
  },
  {
    value: 'vhf' as KnowledgeTopic,
    emoji: '📻',
    label: 'VHF',
    sublabel: 'Kanały polskie wybrzeże',
  },
];

export function KnowledgeSection() {
  const [topic, setTopic] = useState<KnowledgeTopic>('ship-lights');

  return (
    <>
      <TypeSelector options={topicOptions} current={topic} onChange={setTopic} />

      <Suspense
        fallback={
          <div className="section-card text-center py-12">
            <div className="text-3xl mb-3 animate-pulse">💡</div>
            <p className="text-white/50">Ładowanie modułu...</p>
          </div>
        }
      >
        {topic === 'ship-lights' && <ShipLightsSection />}
        {topic === 'vhf' && <VhfSection />}
      </Suspense>
    </>
  );
}
