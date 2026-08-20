/**
 * Loading is a hairline rule that sweeps left to right, not a spinning ring —
 * nothing else in this system is round.
 */
export default function Spinner() {
  return (
    // w-full so the track keeps its width inside a flex or grid parent.
    <div className="w-full py-10" role="status" aria-label="Loading">
      <div className="ba-sweep-track">
        <div className="ba-sweep-bar" />
      </div>
    </div>
  );
}
