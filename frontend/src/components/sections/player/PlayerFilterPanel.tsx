import TourToggle from '../../filters/TourToggle';
import SurfaceSelect from '../../filters/SurfaceSelect';
import LevelSelect from '../../filters/LevelSelect';
import YearRangeSlider from '../../filters/YearRangeSlider';
import PlayerAutocomplete from '../../filters/PlayerAutocomplete';

/** Same recessed well as Records and Versus, so the pages read as one system. */
export function PlayerFilterPanel({
  tour,
  player,
  surface,
  level,
  players,
  yearRange,
  sliderMin,
  sliderMax,
  onTourChange,
  onPlayerChange,
  onSurfaceChange,
  onLevelChange,
  onYearRangeChange,
  onSubmit,
}: {
  tour: string;
  player: string;
  surface: string;
  level: string;
  players: string[];
  yearRange: [number, number];
  sliderMin: number;
  sliderMax: number;
  onTourChange: (value: string) => void;
  onPlayerChange: (value: string) => void;
  onSurfaceChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onYearRangeChange: (value: [number, number]) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="ba-well px-3 py-2.5">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <PlayerAutocomplete
          label="Player"
          value={player}
          onChange={onPlayerChange}
          players={players}
          width="w-full sm:w-64"
        />
        <TourToggle value={tour} onChange={onTourChange} />
        <SurfaceSelect value={surface} onChange={onSurfaceChange} />
        <LevelSelect tour={tour} value={level} onChange={onLevelChange} />
        <YearRangeSlider
          key={`player-year-${yearRange[0]}-${yearRange[1]}-${sliderMin}-${sliderMax}`}
          min={sliderMin}
          max={sliderMax}
          value={yearRange}
          onChange={onYearRangeChange}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!player}
          className="ba-btn ba-btn-primary ml-auto"
        >
          Load profile
        </button>
      </div>
    </section>
  );
}
