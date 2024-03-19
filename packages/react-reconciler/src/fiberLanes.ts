import {
	unstable_IdlePriority,
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority,
	unstable_getCurrentPriorityLevel
} from 'scheduler';
import { FiberRootNode } from './fiber';

// 代表 update 的优先级
export type Lane = number;
// 代表 lane 的集合
export type Lanes = number;

export const NoLane = 0b0000;
export const NoLanes = 0b0000;

export const SyncLane = 0b0001;
export const InputContinuousLane = 0b0010;
export const DefaultLane = 0b0100;
export const IdleLane = 0b1000;

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
	return laneA | laneB;
}

// 获取更新的优先级
export function requestUpdateLanes() {
	// 从上下文环境中获取 Scheduler 优先级
	const currentSchedulerPriority = unstable_getCurrentPriorityLevel();
	const lane = schedulerPriorityToLane(currentSchedulerPriority);
	return lane;
}

// 获取 lanes 中优先级最高的 lane
export function getHighestPriorityLane(lanes: Lanes): Lane {
	// 默认规则：数值越小，优先级越高
	return lanes & -lanes;
}

// 从根节点的 pendingLanes 中移除某个 lane
export function markRootFinished(root: FiberRootNode, lane: Lane): void {
	root.pendingLanes &= ~lane;
}

// 判断优先级是否足够高
export function isSubsetOfLanes(set: Lanes, subset: Lane): boolean {
	return (set & subset) === subset;
}

export function laneToSchedulerPriority(lanes: number): number {
	const lane = getHighestPriorityLane(lanes);
	if (lane == SyncLane) {
		return unstable_ImmediatePriority;
	}
	if (lane == InputContinuousLane) {
		return unstable_UserBlockingPriority;
	}
	if (lane == DefaultLane) {
		return unstable_NormalPriority;
	}
	return unstable_IdlePriority;
}

export function schedulerPriorityToLane(schedulerPriority: number): number {
	if (schedulerPriority == unstable_ImmediatePriority) {
		return SyncLane;
	}
	if (schedulerPriority == unstable_UserBlockingPriority) {
		return InputContinuousLane;
	}
	if (schedulerPriority == unstable_NormalPriority) {
		return DefaultLane;
	}
	return NoLane;
}
