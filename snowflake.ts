class Snowflake {
  private static readonly EPOCH = 1735689600000n; // 2025-01-01 00:00:00 UTC
  private static readonly WORKER_ID_BITS = 5n;
  private static readonly PROCESS_ID_BITS = 5n;
  private static readonly SEQUENCE_BITS = 12n;

  private static readonly MAX_WORKER_ID = (1n << Snowflake.WORKER_ID_BITS) - 1n;
  private static readonly MAX_PROCESS_ID = (1n << Snowflake.PROCESS_ID_BITS) - 1n;
  private static readonly MAX_SEQUENCE = (1n << Snowflake.SEQUENCE_BITS) - 1n;

  private static readonly TIMESTAMP_SHIFT =
    Snowflake.WORKER_ID_BITS + Snowflake.PROCESS_ID_BITS + Snowflake.SEQUENCE_BITS;

  private static readonly WORKER_ID_SHIFT = Snowflake.PROCESS_ID_BITS + Snowflake.SEQUENCE_BITS;
  private static readonly PROCESS_ID_SHIFT = Snowflake.SEQUENCE_BITS;

  private sequence: bigint = 0n;
  private lastTimestamp: bigint = -1n;

  constructor(
    private readonly workerId: bigint | number,
    private readonly processId: bigint | number,
  ) {
    if (typeof workerId === 'number') this.workerId = BigInt(workerId);
    if (typeof processId === 'number') this.processId = BigInt(processId);

    if (workerId < 0n || workerId > Snowflake.MAX_WORKER_ID) {
      throw new Error(`Worker ID must be between 0 and ${Snowflake.MAX_WORKER_ID}`);
    }
    if (processId < 0n || processId > Snowflake.MAX_PROCESS_ID) {
      throw new Error(`Process ID must be between 0 and ${Snowflake.MAX_PROCESS_ID}`);
    }
  }

  nextId(): string {
    let timestamp = BigInt(Date.now());

    if (timestamp < this.lastTimestamp) {
      throw new Error('Clock moved backwards. Refusing to generate id.');
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & Snowflake.MAX_SEQUENCE;

      if (this.sequence === 0n) {
        timestamp = this.waitNextMillis(timestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    return this.composeId(
      timestamp - Snowflake.EPOCH,
      this.workerId as bigint,
      this.processId as bigint,
      this.sequence,
    ).toString();
  }

  private waitNextMillis(currentTimestamp: bigint): bigint {
    let newTimestamp = BigInt(Date.now());
    let waitCount = 0;
    const MAX_WAIT = 50;

    while (newTimestamp <= currentTimestamp) {
      waitCount++;
      if (waitCount > MAX_WAIT) {
        throw new Error('Clock advancement stalled. Failed to generate ID');
      }

      this.delay(Math.min(10, waitCount));
      newTimestamp = BigInt(Date.now());
    }
    return newTimestamp;
  }

  private delay(ms: number): void {
    if (typeof Atomics !== 'undefined' && typeof SharedArrayBuffer !== 'undefined') {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
    } else {
      const start = Date.now();
      while (Date.now() - start < ms) {
        /* empty */
      }
    }
  }

  private composeId(timestamp: bigint, workerId: bigint, processId: bigint, sequence: bigint): bigint {
    return (
      (timestamp << Snowflake.TIMESTAMP_SHIFT) |
      (workerId << Snowflake.WORKER_ID_SHIFT) |
      (processId << Snowflake.PROCESS_ID_SHIFT) |
      sequence
    );
  }

  static getTimestamp(id: string): number {
    const bigIntId = BigInt(id);
    return Number(
      (bigIntId >> (Snowflake.WORKER_ID_BITS + Snowflake.PROCESS_ID_BITS + Snowflake.SEQUENCE_BITS)) + Snowflake.EPOCH,
    );
  }

  static decompose(id: string) {
    const bigIntId = BigInt(id);
    return {
      timestamp: Number((bigIntId >> Snowflake.TIMESTAMP_SHIFT) + Snowflake.EPOCH),
      workerId: Number((bigIntId >> Snowflake.WORKER_ID_SHIFT) & Snowflake.MAX_WORKER_ID),
      processId: Number((bigIntId >> Snowflake.PROCESS_ID_SHIFT) & Snowflake.MAX_PROCESS_ID),
      sequence: Number(bigIntId & Snowflake.MAX_SEQUENCE),
    };
  }
}

export { Snowflake };
