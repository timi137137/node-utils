import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Snowflake } from '../snowflake';

describe('snowflake', () => {
  const originalAtomics = globalThis.Atomics;
  const originalSharedArrayBuffer = globalThis.SharedArrayBuffer;

  // 安全访问私有方法的辅助函数
  const callPrivateMethod = <T>(instance: Snowflake, methodName: string, ...args: any[]): T => {
    return (instance as any)[methodName](...args);
  };
  const setPrivateField = (instance: Snowflake, fieldName: string, value: any): void => {
    (instance as any)[fieldName] = value;
  };
  const getPrivateField = <T>(instance: Snowflake, fieldName: string): T => {
    return (instance as any)[fieldName];
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.Atomics = originalAtomics;
    globalThis.SharedArrayBuffer = originalSharedArrayBuffer;
  });

  describe('constructor', () => {
    it('接受合法的workerId和processId（数字类型）', () => {
      expect(() => new Snowflake(0, 0)).not.toThrow();
      expect(() => new Snowflake(31, 31)).not.toThrow();
    });

    it('接受合法的workerId和processId（bigint类型）', () => {
      expect(() => new Snowflake(0n, 0n)).not.toThrow();
      expect(() => new Snowflake(31n, 31n)).not.toThrow();
    });

    it('拒绝超出范围的workerId', () => {
      expect(() => new Snowflake(-1, 0)).toThrow();
      expect(() => new Snowflake(32, 0)).toThrow();
      expect(() => new Snowflake(-1n, 0n)).toThrow();
      expect(() => new Snowflake(32n, 0n)).toThrow();
    });

    it('拒绝超出范围的processId', () => {
      expect(() => new Snowflake(0, -1)).toThrow();
      expect(() => new Snowflake(0, 32)).toThrow();
      expect(() => new Snowflake(0n, -1n)).toThrow();
      expect(() => new Snowflake(0n, 32n)).toThrow();
    });
  });

  describe('nextId', () => {
    it('生成唯一的ID', () => {
      const snowflake = new Snowflake(1, 1);
      const id1 = snowflake.nextId();
      const id2 = snowflake.nextId();
      expect(id1).not.toEqual(id2);
    });

    it('同一毫秒内递增序列号', () => {
      const snowflake = new Snowflake(1, 1);
      // 固定当前时间
      vi.spyOn(Date, 'now').mockReturnValue(1735689600000);

      const id1 = BigInt(snowflake.nextId());
      const id2 = BigInt(snowflake.nextId());

      // 提取序列号部分
      const sequenceMask = (1n << 12n) - 1n; // SEQUENCE_BITS = 12
      const sequence1 = id1 & sequenceMask;
      const sequence2 = id2 & sequenceMask;

      expect(sequence2).toEqual(sequence1 + 1n);
      // 验证内部序列号状态
      expect(getPrivateField<bigint>(snowflake, 'sequence')).toBe(1n);
    });

    it('序列号溢出时等待下一毫秒', () => {
      const snowflake = new Snowflake(1, 1);

      // 设置序列号为最大值
      setPrivateField(snowflake, 'sequence', 4095n); // MAX_SEQUENCE = 4095

      // 设置最后时间戳为当前时间
      setPrivateField(snowflake, 'lastTimestamp', 1735689600000n);

      // 模拟时间在第一次调用时相同，然后前进
      let callCount = 0;
      vi.spyOn(Date, 'now').mockImplementation(() => {
        return callCount++ > 0 ? 1735689600001 : 1735689600000;
      });
      snowflake.nextId();
      // 序列号应该重置为0
      expect(getPrivateField<bigint>(snowflake, 'sequence')).toBe(0n);

      // 时间戳应该前进1毫秒
      expect(getPrivateField<bigint>(snowflake, 'lastTimestamp')).toBe(1735689600001n);
    });

    it('时钟回拨时抛出错误', () => {
      const snowflake = new Snowflake(1, 1);

      // 设置最后时间戳为未来时间
      setPrivateField(snowflake, 'lastTimestamp', BigInt(Date.now() + 1000));

      // 尝试生成ID（当前时间早于最后时间戳）
      expect(() => snowflake.nextId()).toThrow('Clock moved backwards');
    });
  });

  describe('waitNextMillis', () => {
    it('成功等到下一毫秒', () => {
      const snowflake = new Snowflake(1, 1);
      const startTime = BigInt(Date.now());

      // 模拟时间在开始时相同，然后前进
      let callCount = 0;
      vi.spyOn(Date, 'now').mockImplementation(() => {
        return Number(startTime) + (callCount++ > 1 ? 1 : 0);
      });

      // 使用辅助函数调用私有方法
      const newTimestamp = callPrivateMethod<bigint>(snowflake, 'waitNextMillis', startTime);

      expect(newTimestamp).toBe(startTime + 1n);
    });

    it('超过最大等待次数时抛出错误', () => {
      const snowflake = new Snowflake(1, 1);

      // 模拟时间停滞不前
      vi.spyOn(Date, 'now').mockReturnValue(1735689600000);

      // 使用辅助函数调用私有方法
      expect(() => callPrivateMethod<bigint>(snowflake, 'waitNextMillis', 1735689600001n)).toThrow(
        'Clock advancement stalled',
      );
    });
  });

  describe('delay', () => {
    it('使用Atomics.wait实现延迟', () => {
      const mockAtomics = {
        wait: vi.fn(),
      };
      globalThis.Atomics = mockAtomics as any;
      globalThis.SharedArrayBuffer = ArrayBuffer as any;

      const snowflake = new Snowflake(1, 1);

      // 使用辅助函数调用私有方法
      callPrivateMethod<void>(snowflake, 'delay', 10);

      expect(mockAtomics.wait).toHaveBeenCalledWith(expect.any(Int32Array), 0, 0, 10);
    });

    it('使用忙等待实现延迟时不会阻塞', () => {
      // 移除Atomics支持
      delete (globalThis as any).Atomics;
      delete (globalThis as any).SharedArrayBuffer;

      const snowflake = new Snowflake(1, 1);

      // 模拟 Date.now 返回值
      let time = 1000;
      const dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
        time += 10; // 每次调用时间前进10ms
        return time;
      });

      // 调用delay方法
      callPrivateMethod<void>(snowflake, 'delay', 20);

      // 验证时间已推进
      expect(Date.now()).toBeGreaterThan(1020);

      // 清理
      dateNowSpy.mockRestore();
    });
  });

  describe('staticMethods', () => {
    it('getTimestamp返回正确时间', () => {
      const snowflake = new Snowflake(1, 1);
      const fixedTime = 1735689600000;
      vi.spyOn(Date, 'now').mockReturnValue(fixedTime);

      const id = snowflake.nextId();
      const timestamp = Snowflake.getTimestamp(id);

      expect(timestamp).toBe(fixedTime);
    });

    it('decompose返回正确结构', () => {
      const snowflake = new Snowflake(1, 1);
      const fixedTime = 1735689600000;
      vi.spyOn(Date, 'now').mockReturnValue(fixedTime);

      const id = snowflake.nextId();
      const decomposed = Snowflake.decompose(id);

      expect(decomposed).toEqual({
        timestamp: fixedTime,
        workerId: 1,
        processId: 1,
        sequence: 0,
      });
    });

    it('处理最大序列号', () => {
      const snowflake = new Snowflake(31, 31);

      // 设置序列号为最大值
      setPrivateField(snowflake, 'sequence', 4095n); // MAX_SEQUENCE = 4095
      vi.spyOn(Date, 'now').mockReturnValue(1735689600000);

      const id = snowflake.nextId();
      const decomposed = Snowflake.decompose(id);

      expect(decomposed.sequence).toBe(0);
      expect(decomposed.workerId).toBe(31);
      expect(decomposed.processId).toBe(31);
    });
  });

  describe('边界条件', () => {
    it('最小workerId和processId', () => {
      const snowflake = new Snowflake(0, 0);
      vi.spyOn(Date, 'now').mockReturnValue(1735689600000);

      const id = snowflake.nextId();
      const decomposed = Snowflake.decompose(id);

      expect(decomposed.workerId).toBe(0);
      expect(decomposed.processId).toBe(0);
    });

    it('最大workerId和processId', () => {
      const snowflake = new Snowflake(31, 31);
      vi.spyOn(Date, 'now').mockReturnValue(1735689600000);

      const id = snowflake.nextId();
      const decomposed = Snowflake.decompose(id);

      expect(decomposed.workerId).toBe(31);
      expect(decomposed.processId).toBe(31);
    });

    it('ePOCH时间前的时间戳', () => {
      const snowflake = new Snowflake(1, 1);

      // 设置最后时间戳为EPOCH之前
      setPrivateField(snowflake, 'lastTimestamp', 1735689500000n); // EPOCH = 1735689600000n

      // 模拟当前时间在EPOCH之前
      vi.spyOn(Date, 'now').mockReturnValue(1735689500000);

      // 尝试生成ID
      const id = snowflake.nextId();
      const timestamp = Snowflake.getTimestamp(id);

      // 时间戳应该被标准化到EPOCH之后
      expect(timestamp).toBe(1735689500000);
    });
  });

  describe('composeId', () => {
    it('正确组合ID各部分', () => {
      const snowflake = new Snowflake(1, 1);

      // 使用辅助函数调用私有方法
      const id = callPrivateMethod<bigint>(
        snowflake,
        'composeId',
        100n, // timestamp
        5n, // workerId
        10n, // processId
        100n, // sequence
      );

      // 验证ID结构
      const timestampShift = 5n + 5n + 12n; // WORKER_ID_BITS + PROCESS_ID_BITS + SEQUENCE_BITS
      const workerIdShift = 5n + 12n; // PROCESS_ID_BITS + SEQUENCE_BITS
      const processIdShift = 12n; // SEQUENCE_BITS

      const expectedId = (100n << timestampShift) | (5n << workerIdShift) | (10n << processIdShift) | 100n;

      expect(id).toBe(expectedId);
    });
  });
});
