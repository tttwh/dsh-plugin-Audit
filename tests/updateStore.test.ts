// @file tests/updateStore.test.ts
// @description 客户端更新队列：运行中点击不丢失、合并为下一批且 pnpm 不并发。

import { afterEach, describe, expect, it } from 'vitest';

import { clearUpdateTask, getUpdateTask, startUpdateTask } from '../src/client/updateStore';
import type { UpdateFace } from '../src/client/updateStore';
import type { UpdateResult } from '../src/contract';

function success(names: string[]): UpdateResult {
  return { ok: true, exitCode: 0, output: '', updated: names, error: null };
}

afterEach(() => {
  clearUpdateTask();
});

describe('startUpdateTask queue', () => {
  it('运行中新增目标进入下一批，且两批不会并发', async () => {
    const calls: string[][] = [];
    const releases: Array<() => void> = [];
    let active = 0;
    let maxActive = 0;
    const face: UpdateFace = {
      update: async (names) => {
        calls.push([...names]);
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise<void>((resolve) => releases.push(resolve));
        active--;
        return { ok: true, value: success(names) };
      },
    };

    const first = startUpdateTask(face, ['a']);
    expect(calls).toEqual([['a']]);
    const joined = startUpdateTask(face, ['b']);
    expect(getUpdateTask()).toEqual({ kind: 'running', names: ['a', 'b'] });

    releases.shift()?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toEqual([['a'], ['b']]);
    releases.shift()?.();

    const [firstResult, joinedResult] = await Promise.all([first, joined]);
    expect(maxActive).toBe(1);
    expect(firstResult).toMatchObject({ kind: 'done', ok: true, names: ['a', 'b'] });
    expect(joinedResult).toEqual(firstResult);
  });

  it('同一目标的重复点击只执行一次', async () => {
    const calls: string[][] = [];
    let release: (() => void) | undefined;
    const face: UpdateFace = {
      update: async (names) => {
        calls.push([...names]);
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return { ok: true, value: success(names) };
      },
    };

    const first = startUpdateTask(face, ['a']);
    const duplicate = startUpdateTask(face, ['a']);
    release?.();
    await Promise.all([first, duplicate]);
    expect(calls).toEqual([['a']]);
  });
});
