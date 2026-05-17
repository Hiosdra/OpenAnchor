import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  type ShipLightProfile,
  type LightDef,
  type DayMarkDef,
  getLightVisibility,
} from '../../../data/ship-lights-data';

interface ViewerProps {
  profile: ShipLightProfile;
  isNight: boolean;
}

// ── Ship Hull ──────────────────────────────────────────────────

function ShipHull({ hullType, isNight }: { hullType: string; isNight: boolean }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (hullType === 'sail') {
      s.moveTo(0, 5);
      s.quadraticCurveTo(1.2, 3, 1.1, 0);
      s.lineTo(1.0, -4);
      s.quadraticCurveTo(0.8, -4.8, 0, -5);
      s.quadraticCurveTo(-0.8, -4.8, -1.0, -4);
      s.lineTo(-1.1, 0);
      s.quadraticCurveTo(-1.2, 3, 0, 5);
    } else if (hullType === 'tug') {
      s.moveTo(0, 4);
      s.quadraticCurveTo(1.5, 2.5, 1.5, 0);
      s.lineTo(1.5, -3);
      s.lineTo(1.3, -4);
      s.lineTo(-1.3, -4);
      s.lineTo(-1.5, -3);
      s.lineTo(-1.5, 0);
      s.quadraticCurveTo(-1.5, 2.5, 0, 4);
    } else {
      // motor, fishing, pilot share a generic power-vessel hull
      s.moveTo(0, 4.5);
      s.quadraticCurveTo(1.3, 3, 1.3, 0);
      s.lineTo(1.3, -3.5);
      s.lineTo(1.1, -4.5);
      s.lineTo(-1.1, -4.5);
      s.lineTo(-1.3, -3.5);
      s.lineTo(-1.3, 0);
      s.quadraticCurveTo(-1.3, 3, 0, 4.5);
    }
    return s;
  }, [hullType]);

  const hullColor = isNight ? '#1e3a5f' : '#2a4a7f';
  const deckColor = isNight ? '#2d4a6f' : '#4a7ab0';
  const edgeColor = isNight ? '#4a8ecf' : '#6ab0e8';
  const metalColor = isNight ? '#5580aa' : '#4a7090';

  return (
    <group>
      {/* Hull body */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 2.0,
              bevelEnabled: true,
              bevelThickness: 0.3,
              bevelSize: 0.15,
              bevelSegments: 4,
            },
          ]}
        />
        <meshPhongMaterial
          color={hullColor}
          emissive={isNight ? '#0a1a30' : '#000000'}
          specular="#4488cc"
          shininess={30}
        />
      </mesh>

      {/* Hull wireframe */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
        <extrudeGeometry
          args={[
            shape,
            {
              depth: 2.0,
              bevelEnabled: true,
              bevelThickness: 0.3,
              bevelSize: 0.15,
              bevelSegments: 4,
            },
          ]}
        />
        <meshBasicMaterial
          color={edgeColor}
          wireframe
          transparent
          opacity={isNight ? 0.15 : 0.08}
        />
      </mesh>

      {/* Deck */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.5, 0]}>
        <shapeGeometry args={[shape]} />
        <meshPhongMaterial
          color={deckColor}
          emissive={isNight ? '#0d2240' : '#000000'}
          specular="#88aacc"
          shininess={20}
        />
      </mesh>

      {/* ── Superstructure varies by hull type ── */}
      <HullSuperstructure
        hullType={hullType}
        isNight={isNight}
        metalColor={metalColor}
        edgeColor={edgeColor}
      />

      {/* Railing posts (bow) */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={`rail-${i}`} position={[x, 2.9, -3.5]}>
          <cylinderGeometry args={[0.02, 0.02, 0.8, 4]} />
          <meshPhongMaterial color={isNight ? '#6090b0' : '#7ab0d0'} />
        </mesh>
      ))}
      <mesh position={[0, 3.2, -3.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 1.8, 4]} />
        <meshPhongMaterial color={isNight ? '#5080a0' : '#6090b0'} />
      </mesh>
    </group>
  );
}

function HullSuperstructure({
  hullType,
  isNight,
  metalColor,
  edgeColor,
}: {
  hullType: string;
  isNight: boolean;
  metalColor: string;
  edgeColor: string;
}) {
  const cabinColor = isNight ? '#253d5c' : '#3a6090';
  const cabinEmissive = isNight ? '#0a1525' : '#000000';

  if (hullType === 'sail') {
    return (
      <group>
        {/* Tall mast */}
        <mesh position={[0, 5.5, -0.5]}>
          <cylinderGeometry args={[0.04, 0.07, 10, 8]} />
          <meshPhongMaterial
            color={metalColor}
            emissive={isNight ? '#1a3050' : '#000000'}
            specular="#aaccee"
            shininess={60}
          />
        </mesh>
        {/* Boom — horizontal spar running aft */}
        <mesh position={[0, 3, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.02, 4.5, 6]} />
          <meshPhongMaterial color={metalColor} />
        </mesh>
        {/* Mainsail */}
        <Sail isNight={isNight} />
        {/* Small cockpit aft */}
        <mesh position={[0, 2.9, 2.5]}>
          <boxGeometry args={[1.2, 0.6, 1.8]} />
          <meshPhongMaterial
            color={cabinColor}
            emissive={cabinEmissive}
            specular="#6699cc"
            shininess={40}
          />
        </mesh>
        {/* Shroud lines — port and starboard */}
        {[-1, 1].map((side) => (
          <mesh
            key={`shroud-${side}`}
            position={[side * 0.5, 5, -0.5]}
            rotation={[0, 0, side * 0.12]}
          >
            <cylinderGeometry args={[0.01, 0.01, 6, 3]} />
            <meshPhongMaterial color={metalColor} transparent opacity={0.4} />
          </mesh>
        ))}
      </group>
    );
  }

  if (hullType === 'fishing') {
    return (
      <group>
        {/* Wheelhouse mid-aft */}
        <mesh position={[0, 3.4, 1]}>
          <boxGeometry args={[1.8, 1.6, 2]} />
          <meshPhongMaterial
            color={cabinColor}
            emissive={cabinEmissive}
            specular="#6699cc"
            shininess={40}
          />
        </mesh>
        <mesh position={[0, 3.4, 1]}>
          <boxGeometry args={[1.8, 1.6, 2]} />
          <meshBasicMaterial
            color={edgeColor}
            wireframe
            transparent
            opacity={isNight ? 0.1 : 0.05}
          />
        </mesh>
        {/* Mast with gantry/working arm */}
        <mesh position={[0, 5, -1]}>
          <cylinderGeometry args={[0.05, 0.08, 7, 8]} />
          <meshPhongMaterial
            color={metalColor}
            emissive={isNight ? '#1a3050' : '#000000'}
            specular="#aaccee"
            shininess={60}
          />
        </mesh>
        {/* Fishing boom / davit — angled outrigger arm */}
        <mesh position={[0.8, 5.5, -1]} rotation={[0.4, 0, 0.5]}>
          <cylinderGeometry args={[0.03, 0.02, 4, 6]} />
          <meshPhongMaterial color={metalColor} />
        </mesh>
        {/* Cross-beam */}
        <mesh position={[0, 7, -1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} />
          <meshPhongMaterial color={metalColor} />
        </mesh>
      </group>
    );
  }

  if (hullType === 'tug') {
    return (
      <group>
        {/* Wide low wheelhouse aft */}
        <mesh position={[0, 3.2, 1]}>
          <boxGeometry args={[2.2, 1.4, 2.5]} />
          <meshPhongMaterial
            color={cabinColor}
            emissive={cabinEmissive}
            specular="#6699cc"
            shininess={40}
          />
        </mesh>
        <mesh position={[0, 3.2, 1]}>
          <boxGeometry args={[2.2, 1.4, 2.5]} />
          <meshBasicMaterial
            color={edgeColor}
            wireframe
            transparent
            opacity={isNight ? 0.1 : 0.05}
          />
        </mesh>
        {/* Short sturdy mast */}
        <mesh position={[0, 4.5, -0.5]}>
          <cylinderGeometry args={[0.06, 0.1, 5, 8]} />
          <meshPhongMaterial
            color={metalColor}
            emissive={isNight ? '#1a3050' : '#000000'}
            specular="#aaccee"
            shininess={60}
          />
        </mesh>
        {/* Cross-beam */}
        <mesh position={[0, 6.5, -0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} />
          <meshPhongMaterial color={metalColor} />
        </mesh>
        {/* Tow bollard at stern */}
        <mesh position={[0, 2.7, 3.5]}>
          <cylinderGeometry args={[0.15, 0.2, 0.5, 8]} />
          <meshPhongMaterial
            color={isNight ? '#3a5570' : '#556680'}
            specular="#888"
            shininess={50}
          />
        </mesh>
      </group>
    );
  }

  if (hullType === 'pilot') {
    return (
      <group>
        {/* Tall bridge / wheelhouse (pilot boats have large bridge) */}
        <mesh position={[0, 3.8, 0.5]}>
          <boxGeometry args={[1.8, 2, 2.5]} />
          <meshPhongMaterial
            color={cabinColor}
            emissive={cabinEmissive}
            specular="#6699cc"
            shininess={40}
          />
        </mesh>
        <mesh position={[0, 3.8, 0.5]}>
          <boxGeometry args={[1.8, 2, 2.5]} />
          <meshBasicMaterial
            color={edgeColor}
            wireframe
            transparent
            opacity={isNight ? 0.1 : 0.05}
          />
        </mesh>
        {/* Mast */}
        <mesh position={[0, 5.5, -1.5]}>
          <cylinderGeometry args={[0.04, 0.07, 7, 8]} />
          <meshPhongMaterial
            color={metalColor}
            emissive={isNight ? '#1a3050' : '#000000'}
            specular="#aaccee"
            shininess={60}
          />
        </mesh>
        {/* Cross-beam */}
        <mesh position={[0, 8, -1.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
          <meshPhongMaterial color={metalColor} />
        </mesh>
        {/* Flag pole at stern */}
        <mesh position={[0, 3.8, 3.5]}>
          <cylinderGeometry args={[0.02, 0.02, 2.5, 4]} />
          <meshPhongMaterial color={metalColor} />
        </mesh>
      </group>
    );
  }

  // Default: motor vessel
  return (
    <group>
      {/* Cabin/superstructure aft */}
      <mesh position={[0, 3.2, 1.5]}>
        <boxGeometry args={[1.6, 1.2, 2.2]} />
        <meshPhongMaterial
          color={cabinColor}
          emissive={cabinEmissive}
          specular="#6699cc"
          shininess={40}
        />
      </mesh>
      <mesh position={[0, 3.2, 1.5]}>
        <boxGeometry args={[1.6, 1.2, 2.2]} />
        <meshBasicMaterial
          color={edgeColor}
          wireframe
          transparent
          opacity={isNight ? 0.12 : 0.06}
        />
      </mesh>
      {/* Mast forward */}
      <mesh position={[0, 4.5, -1.5]}>
        <cylinderGeometry args={[0.05, 0.08, 7, 8]} />
        <meshPhongMaterial
          color={metalColor}
          emissive={isNight ? '#1a3050' : '#000000'}
          specular="#aaccee"
          shininess={60}
        />
      </mesh>
      {/* Cross-beam */}
      <mesh position={[0, 7, -1.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 6]} />
        <meshPhongMaterial color={metalColor} />
      </mesh>
    </group>
  );
}

// ── Mine Clearance Yardarm Extension ──────────────────────────

function MineYardarm({ isNight }: { isNight: boolean }) {
  const metalColor = isNight ? '#283550' : '#5a6a7a';
  return (
    <group>
      {/* Mast extension above motor hull mast top (Y=8 → Y=10) */}
      <mesh position={[0, 9, -1.5]}>
        <cylinderGeometry args={[0.03, 0.04, 2, 6]} />
        <meshPhongMaterial color={metalColor} specular="#aaccee" shininess={40} />
      </mesh>
      {/* Wide yardarm: extends ±1.5 (total 3.0) to hold side balls */}
      <mesh position={[0, 7, -1.5]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 3.0, 6]} />
        <meshPhongMaterial color={metalColor} specular="#aaccee" shininess={40} />
      </mesh>
    </group>
  );
}

// ── Navigation Light ───────────────────────────────────────────

const DECK_LEVEL = 2.6;

function LightPole({
  light,
  isNight,
  mainMastZ,
}: {
  light: LightDef;
  isNight: boolean;
  mainMastZ: number;
}) {
  const lightY = light.position[1];
  const lightZ = light.position[2];
  // Only draw pole at night for elevated lights not already on the main mast
  if (!isNight) return null;
  if (lightY <= DECK_LEVEL + 0.5) return null;
  if (Math.abs(lightZ - mainMastZ) < 0.3) return null;

  const poleHeight = lightY - DECK_LEVEL;
  const midY = DECK_LEVEL + poleHeight / 2;
  const metalColor = isNight ? '#4a6a8a' : '#6a8aaa';

  return (
    <mesh position={[light.position[0], midY, lightZ]}>
      <cylinderGeometry args={[0.025, 0.035, poleHeight, 6]} />
      <meshPhongMaterial color={metalColor} specular="#aaccee" shininess={40} />
    </mesh>
  );
}

function NavLight({
  light,
  cameraAngle,
  isNight,
}: {
  light: LightDef;
  cameraAngle: number;
  isNight: boolean;
}) {
  const glowRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef(true);
  const [flashOn, setFlashOn] = React.useState(true);
  const visibility = isNight ? getLightVisibility(light, cameraAngle) : 0;

  const color = useMemo(() => {
    switch (light.color) {
      case 'red':
        return '#ff2020';
      case 'green':
        return '#00ff40';
      case 'yellow':
        return '#ffdd00';
      case 'white':
        return '#fffff0';
      case 'blue':
        return '#4488ff';
    }
  }, [light.color]);

  const dimColor = useMemo(() => {
    switch (light.color) {
      case 'red':
        return '#661010';
      case 'green':
        return '#006618';
      case 'yellow':
        return '#665500';
      case 'white':
        return '#666655';
      case 'blue':
        return '#223366';
    }
  }, [light.color]);

  useFrame((state) => {
    if (light.flashing) {
      const next = Math.sin(state.clock.elapsedTime * Math.PI) > 0;
      if (next !== flashRef.current) {
        flashRef.current = next;
        setFlashOn(next);
      }
    }
    if (glowRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3 + light.position[1] * 2) * 0.06;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  // Day mode: don't render light fixtures
  if (!isNight) return null;

  const intensity = visibility * (light.flashing ? (flashOn ? 1 : 0) : 1);

  return (
    <group position={[light.position[0], light.position[1], light.position[2]]}>
      {/* Light housing — always visible */}
      <mesh>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshPhongMaterial
          color={intensity > 0.01 ? '#111' : '#1a1a1a'}
          specular="#333"
          shininess={20}
        />
      </mesh>

      {intensity > 0.01 ? (
        <>
          {/* Bright core — visible in sector */}
          <mesh>
            <sphereGeometry args={[0.1 + intensity * 0.03, 12, 12]} />
            <meshBasicMaterial color={color} transparent opacity={intensity * 0.95} />
          </mesh>

          {/* Soft glow halo */}
          <mesh ref={glowRef}>
            <sphereGeometry args={[0.22 + intensity * 0.08, 12, 12]} />
            <meshBasicMaterial color={color} transparent opacity={intensity * 0.25} />
          </mesh>

          {/* Point light — subtle colored spill */}
          {intensity > 0.3 && (
            <pointLight color={color} intensity={intensity * 1.5} distance={3} decay={2} />
          )}
        </>
      ) : (
        <>
          {/* Out of sector: colored tint at light position */}
          <mesh>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshBasicMaterial color={dimColor} transparent opacity={0.5} />
          </mesh>

          {/* Raised indicator stem + marker visible above hull */}
          <group>
            {/* Thin vertical line from light up above hull */}
            <mesh position={[0, 1.8, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 3.6, 4]} />
              <meshBasicMaterial color={dimColor} transparent opacity={0.35} />
            </mesh>
            {/* Small colored marker at top — always visible */}
            <mesh position={[0, 3.7, 0]}>
              <octahedronGeometry args={[0.12, 0]} />
              <meshBasicMaterial color={dimColor} transparent opacity={0.7} />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
}

// ── Day Mark ───────────────────────────────────────────────────

function DayMark({ mark, isNight }: { mark: DayMarkDef; isNight: boolean }) {
  if (isNight) return null;

  const pos: [number, number, number] = [mark.position[0], mark.position[1], mark.position[2]];

  if (mark.shape === 'flag-h') {
    // ICS "Hotel" flag: left half white, right half red, hanging from mast top
    // Flag in XY plane (face visible from bow direction), hoist at mast, fly to starboard
    return (
      <group position={pos}>
        {/* White (hoist) half */}
        <mesh position={[0.3, -0.45, 0]}>
          <boxGeometry args={[0.6, 0.9, 0.06]} />
          <meshPhongMaterial
            color="#f0f0f0"
            side={THREE.DoubleSide}
            specular="#aaaaaa"
            shininess={20}
          />
        </mesh>
        {/* Red (fly) half */}
        <mesh position={[0.9, -0.45, 0]}>
          <boxGeometry args={[0.6, 0.9, 0.06]} />
          <meshPhongMaterial
            color="#cc1111"
            side={THREE.DoubleSide}
            specular="#994444"
            shininess={20}
          />
        </mesh>
      </group>
    );
  }

  if (mark.shape === 'diamond') {
    return (
      <group position={pos}>
        {/* Upper cone — tip points DOWN toward center */}
        <mesh position={[0, 0.32, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.35, 0.65, 8]} />
          <meshPhongMaterial color="#111" specular="#333" shininess={10} />
        </mesh>
        {/* Lower cone — tip points UP toward center */}
        <mesh position={[0, -0.32, 0]}>
          <coneGeometry args={[0.35, 0.65, 8]} />
          <meshPhongMaterial color="#111" specular="#333" shininess={10} />
        </mesh>
      </group>
    );
  }

  if (mark.shape === 'cylinder') {
    return (
      <mesh position={pos}>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 12]} />
        <meshPhongMaterial color="#111" specular="#222" shininess={10} />
      </mesh>
    );
  }

  return (
    <mesh position={pos} rotation={mark.shape === 'cone-down' ? [Math.PI, 0, 0] : [0, 0, 0]}>
      {mark.shape === 'ball' ? (
        <sphereGeometry args={[0.35, 16, 16]} />
      ) : (
        <coneGeometry args={[0.35, 0.7, 8]} />
      )}
      <meshPhongMaterial color="#111" specular="#222" shininess={10} />
    </mesh>
  );
}

// ── Water Surface ──────────────────────────────────────────────

function WaterSurface({ isNight }: { isNight: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshPhongMaterial;
      mat.emissiveIntensity = 0.05 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
      <planeGeometry args={[40, 40, 20, 20]} />
      <meshPhongMaterial
        color={isNight ? '#030d1a' : '#1a6090'}
        emissive={isNight ? '#041020' : '#0a3050'}
        emissiveIntensity={0.05}
        specular={isNight ? '#1a3050' : '#4488aa'}
        shininess={isNight ? 100 : 60}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

// ── Compass Indicator ──────────────────────────────────────────

function CompassOverlay({ angle }: { angle: number }) {
  return (
    <div className="absolute bottom-3 right-3 w-16 h-16 rounded-full bg-black/40 border border-white/20 backdrop-blur-sm flex items-center justify-center">
      <div className="relative w-12 h-12">
        {/* Cardinal directions */}
        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[0.6rem] font-bold text-blue-300">
          DZ
        </span>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[0.6rem] font-bold text-white/40">
          RU
        </span>
        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[0.6rem] font-bold text-red-400">
          Bb
        </span>
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[0.6rem] font-bold text-green-400">
          StB
        </span>
        {/* Arrow */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div className="w-0.5 h-4 bg-yellow-400 rounded-full origin-bottom translate-y-[-4px]" />
          <div className="absolute w-2 h-2 rounded-full bg-yellow-400/60 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    </div>
  );
}

// ── Camera Angle Tracker ───────────────────────────────────────

function CameraAngleTracker({ onAngleChange }: { onAngleChange: (angle: number) => void }) {
  const { camera } = useThree();

  useFrame(() => {
    // Bearing from bow (-Z), clockwise: 0°=bow, 90°=StB, 180°=stern, 270°=Bb
    const angle = Math.atan2(camera.position.x, -camera.position.z);
    let deg = (angle * 180) / Math.PI;
    deg = ((deg % 360) + 360) % 360;
    onAngleChange(deg);
  });

  return null;
}

// ── Sail Mesh ──────────────────────────────────────────────────

function Sail({ isNight }: { isNight: boolean }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // Mainsail triangle: tack(0,0,0), head(0,7,0), clew(0,0,4)
    // Two faces for double-sided without material DoubleSide depth issues
    const vertices = new Float32Array([
      0,
      0,
      0,
      0,
      7,
      0,
      0,
      0,
      4, // front face
      0,
      0,
      0,
      0,
      0,
      4,
      0,
      7,
      0, // back face
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh geometry={geo} position={[0, 3, -0.5]}>
      <meshPhongMaterial
        color={isNight ? '#8899bb' : '#ddeeff'}
        transparent
        opacity={isNight ? 0.45 : 0.7}
        side={THREE.DoubleSide}
        specular="#aaccff"
        shininess={15}
      />
    </mesh>
  );
}

function SkyBackground({ isNight }: { isNight: boolean }) {
  const bgColor = isNight ? '#030810' : '#87CEEB';

  return (
    <>
      <color attach="background" args={[bgColor]} />
      {!isNight && (
        <mesh scale={[-1, 1, -1]} position={[0, -5, 0]}>
          <sphereGeometry args={[60, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshBasicMaterial side={THREE.BackSide} vertexColors={false}>
            <color attach="color" args={['#87CEEB']} />
          </meshBasicMaterial>
        </mesh>
      )}
    </>
  );
}

// ── Scene ──────────────────────────────────────────────────────

function Scene({ profile, isNight }: ViewerProps) {
  const [cameraAngle, setCameraAngle] = React.useState(0);

  return (
    <>
      <CameraAngleTracker onAngleChange={setCameraAngle} />
      <SkyBackground isNight={isNight} />

      {/* Lighting setup */}
      <ambientLight intensity={isNight ? 0.35 : 1.4} color={isNight ? '#4466aa' : '#e8f0ff'} />

      {/* Key light - slightly from above and side */}
      <directionalLight
        position={[3, 8, 4]}
        intensity={isNight ? 0.3 : 1.2}
        color={isNight ? '#4477bb' : '#fff8ee'}
      />

      {/* Fill light from opposite side */}
      <directionalLight
        position={[-4, 5, -3]}
        intensity={isNight ? 0.1 : 0.6}
        color={isNight ? '#334466' : '#cce0ff'}
      />

      {/* Rim light from behind for outline */}
      <directionalLight
        position={[0, 3, -8]}
        intensity={isNight ? 0.25 : 0.4}
        color={isNight ? '#6699cc' : '#ffffff'}
      />

      {/* Top-down fill to prevent pure black areas */}
      <directionalLight
        position={[0, 12, 0]}
        intensity={isNight ? 0.08 : 0.5}
        color={isNight ? '#223355' : '#ffffff'}
      />

      {/* Ship hull */}
      <ShipHull hullType={profile.hullType} isNight={isNight} />

      {/* Mine clearance: extended mast + wide yardarm */}
      {profile.type === 'mine-clearance' && <MineYardarm isNight={isNight} />}

      {/* Light support poles */}
      {profile.lights.map((light) => (
        <LightPole
          key={`pole-${light.id}`}
          light={light}
          isNight={isNight}
          mainMastZ={
            profile.hullType === 'sail'
              ? -0.5
              : profile.hullType === 'fishing'
                ? -1
                : profile.hullType === 'tug'
                  ? -0.5
                  : -1.5
          }
        />
      ))}

      {/* Navigation lights */}
      {profile.lights.map((light) => (
        <NavLight key={light.id} light={light} cameraAngle={cameraAngle} isNight={isNight} />
      ))}

      {/* Day marks */}
      {profile.dayMarks?.map((mark) => (
        <DayMark key={mark.id} mark={mark} isNight={isNight} />
      ))}

      {/* Water */}
      <WaterSurface isNight={isNight} />

      {/* Subtle horizon fog */}
      <fog attach="fog" args={[isNight ? '#030810' : '#87CEEB', 20, 50]} />

      {/* Controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={8}
        maxDistance={22}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.3}
        target={[0, 2.5, 0]}
        autoRotate={false}
        dampingFactor={0.08}
        enableDamping
      />
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function ShipLightsViewer3D({ profile, isNight }: ViewerProps) {
  const [viewAngle, setViewAngle] = React.useState(0);

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 5, -13], fov: 45 }}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: isNight ? '#030810' : '#87CEEB' }}
      >
        <Scene profile={profile} isNight={isNight} />
        <CameraAngleExporter onAngle={setViewAngle} />
      </Canvas>

      {/* Compass overlay */}
      <CompassOverlay angle={viewAngle} />

      {/* Interaction hint */}
      <div className="absolute bottom-3 left-3 text-[0.65rem] text-white/30 pointer-events-none">
        ↔ Przeciągnij aby obrócić
      </div>
    </div>
  );
}

// Helper to export camera angle to React state outside Canvas
function CameraAngleExporter({ onAngle }: { onAngle: (a: number) => void }) {
  const { camera } = useThree();
  useFrame(() => {
    const angle = Math.atan2(camera.position.x, -camera.position.z);
    let deg = (angle * 180) / Math.PI;
    deg = ((deg % 360) + 360) % 360;
    onAngle(deg);
  });
  return null;
}
