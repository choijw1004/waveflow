const TAU = Math.PI * 2;
export const RECORD_SECONDS_PER_TURN = 30;

/** Image copy 4: a square waveform sleeve overlaps the left half of a record. */
export const recordGeometry = (width: number, height: number) => {
  const size = Math.min(width * 0.57, height * 0.59, 600);
  const left = (width - (size * 1.445)) / 2;
  const cy = height * (width < 720 ? 0.5 : 0.52);
  return {
    cx: left + (size * 0.95),
    cy,
    radius: size * 0.495,
    exposedX: left + size,
    sleeve: { x: left, y: cy - (size / 2), size },
  };
};

/** Unwraps angular input at ±π, so a record can be turned repeatedly in either direction. */
export class RecordScrub {
  time: number;
  rotation: number;
  moved = false;
  private angle: number;
  private distance = 0;
  private readonly duration: number;

  constructor(angle: number, time: number, rotation: number, duration: number) {
    this.duration = duration;
    this.angle = angle;
    this.time = time;
    this.rotation = rotation;
  }

  move(angle: number) {
    const delta = Math.atan2(
      Math.sin(angle - this.angle),
      Math.cos(angle - this.angle),
    );
    this.angle = angle;
    this.rotation += delta;
    this.distance += Math.abs(delta);
    this.moved ||= this.distance > 0.025;
    this.time = Math.max(
      0,
      Math.min(
        Math.max(0, this.duration - 0.25),
        this.time + ((delta / TAU) * RECORD_SECONDS_PER_TURN),
      ),
    );
    return this.time;
  }

  /** Re-anchor after crossing the spindle, where an angle has no useful direction. */
  reanchor(angle: number) {
    this.angle = angle;
  }
}
