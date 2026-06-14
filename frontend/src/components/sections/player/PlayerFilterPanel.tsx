import TourToggle from '../../filters/TourToggle';
import SurfaceSelect from '../../filters/SurfaceSelect';
import LevelSelect from '../../filters/LevelSelect';
import YearRangeSlider from '../../filters/YearRangeSlider';
import PlayerAutocomplete from '../../filters/PlayerAutocomplete';
import FilterPanel from '../../ui/FilterPanel';

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
    <FilterPanel
      kicker="Player filters"
      summary={`${tour === 'M' ? 'ATP' : 'WTA'} · ${surface}${level ? ` · ${level}` : ''} · ${yearRange[0]}–${yearRange[1]}`}
      actions={(
        <button onClick={onSubmit} disabled={!player} className="ba-btn ba-btn-primary">
          Load Profile →
        </button>
      )}
    >
      <TourToggle value={tour} onChange={onTourChange} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1.25fr)_auto_auto_minmax(20rem,1.4fr)] gap-4 items-end">
        <PlayerAutocomplete label="Player" value={player} onChange={onPlayerChange} players={players} />
        <SurfaceSelect value={surface} onChange={onSurfaceChange} />
        <LevelSelect tour={tour} value={level} onChange={onLevelChange} />
        <YearRangeSlider
          key={`player-year-${yearRange[0]}-${yearRange[1]}-${sliderMin}-${sliderMax}`}
          min={sliderMin}
          max={sliderMax}
          value={yearRange}
          onChange={onYearRangeChange}
        />
      </div>
    </FilterPanel>
  );
}
