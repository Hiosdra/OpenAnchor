import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shipLightProfiles } from '../src/modules/zeglowanie/data/ship-lights-data';

type FrameCallback = (state: { clock: { elapsedTime: number } }) => void;

const frameCallbacks = vi.hoisted(() => [] as FrameCallback[]);
const cameraPosition = vi.hoisted(() => ({ x: 4, z: -8 }));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="three-canvas">{children}</div>
  ),
  useFrame: (callback: FrameCallback) => {
    frameCallbacks.push(callback);
  },
  useThree: () => ({ camera: { position: cameraPosition } }),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
}));

function hydrateThreeElementRefs() {
  for (const mesh of document.querySelectorAll('mesh')) {
    Object.assign(mesh, {
      scale: { setScalar: vi.fn() },
      material: { emissiveIntensity: 0 },
    });
  }
}

describe('ShipLightsViewer3D', () => {
  beforeEach(() => {
    frameCallbacks.length = 0;
    cameraPosition.x = 4;
    cameraPosition.z = -8;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders every vessel profile in night mode and advances animated frames', async () => {
    const { default: ShipLightsViewer3D } =
      await import('../src/modules/zeglowanie/components/knowledge/ship-lights/ShipLightsViewer3D');
    const { rerender } = render(<ShipLightsViewer3D profile={shipLightProfiles[0]} isNight />);

    for (const profile of shipLightProfiles) {
      const firstNewCallback = frameCallbacks.length;
      rerender(<ShipLightsViewer3D profile={profile} isNight />);
      hydrateThreeElementRefs();

      await act(async () => {
        for (const callback of frameCallbacks.slice(firstNewCallback)) {
          callback({ clock: { elapsedTime: 1.5 } });
          callback({ clock: { elapsedTime: 2.5 } });
        }
      });
    }

    expect(screen.getByTestId('three-canvas')).toBeTruthy();
    expect(screen.getByTestId('orbit-controls')).toBeTruthy();
    expect(screen.getByText(/Przeciągnij aby obrócić/)).toBeTruthy();
  });

  it('renders every day-mark shape and daylight hull variant', async () => {
    const { default: ShipLightsViewer3D } =
      await import('../src/modules/zeglowanie/components/knowledge/ship-lights/ShipLightsViewer3D');
    const { rerender } = render(
      <ShipLightsViewer3D profile={shipLightProfiles[0]} isNight={false} />,
    );

    for (const profile of shipLightProfiles) {
      rerender(<ShipLightsViewer3D profile={profile} isNight={false} />);
    }

    expect(screen.getByTestId('three-canvas')).toBeTruthy();
    expect(document.querySelectorAll('mesh').length).toBeGreaterThan(0);
  });

  it('normalizes camera bearings on both sides of north', async () => {
    const { default: ShipLightsViewer3D } =
      await import('../src/modules/zeglowanie/components/knowledge/ship-lights/ShipLightsViewer3D');
    render(<ShipLightsViewer3D profile={shipLightProfiles[0]} isNight />);
    hydrateThreeElementRefs();

    await act(async () => {
      cameraPosition.x = -4;
      cameraPosition.z = -8;
      for (const callback of frameCallbacks) {
        callback({ clock: { elapsedTime: 0 } });
      }
    });

    expect(screen.getByText('DZ')).toBeTruthy();
    expect(screen.getByText('RU')).toBeTruthy();
    expect(screen.getByText('Bb')).toBeTruthy();
    expect(screen.getByText('StB')).toBeTruthy();
  });

  it('drives the complete ship-light selector in night and day modes', async () => {
    const { default: ShipLightsSection } =
      await import('../src/modules/zeglowanie/components/knowledge/ship-lights/ShipLightsSection');
    const { container } = render(<ShipLightsSection />);

    await waitFor(() => expect(screen.getByTestId('three-canvas')).toBeTruthy());
    const profileButtons = Array.from(container.querySelectorAll('button')).filter((button) =>
      shipLightProfiles.some((profile) => button.textContent?.includes(profile.name)),
    );
    expect(profileButtons).toHaveLength(shipLightProfiles.length);

    for (const button of profileButtons) {
      fireEvent.click(button);
    }
    fireEvent.click(screen.getByRole('button', { name: /Noc/ }));
    expect(screen.getByRole('button', { name: /Dzień/ })).toBeTruthy();
  });

  it('renders VHF groups and switches knowledge topics', async () => {
    const { default: VhfSection } =
      await import('../src/modules/zeglowanie/components/knowledge/vhf/VhfSection');
    const { KnowledgeSection } =
      await import('../src/modules/zeglowanie/components/knowledge/KnowledgeSection');

    const vhf = render(<VhfSection />);
    expect(screen.getByText('Polish Rescue Radio')).toBeTruthy();
    expect(screen.getByText('VTS Zatoka')).toBeTruthy();
    expect(screen.getByText('Elbląg i wszystkie porty Zalewu Wiślanego')).toBeTruthy();
    vhf.unmount();

    render(<KnowledgeSection />);
    fireEvent.click(screen.getByRole('button', { name: /VHF/ }));
    await waitFor(() => expect(screen.getByText('Polish Rescue Radio')).toBeTruthy());
  });
});
