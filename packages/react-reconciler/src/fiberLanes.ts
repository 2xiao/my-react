import { FiberRootNode } from './fiber';

// 代表 update 的优先级
export type Lane = number;
// 代表 lane 的集合
export type Lanes = number;

export const NoLane = 0b0000;
export const NoLanes = 0b0000;

export const SyncLane = 0b0001;

export function mergeLanes(laneA: Lane, laneB: Lane): Lanes {
	return laneA | laneB;
}

// 获取更新的优先级
export function requestUpdateLanes() {
	return SyncLane;
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
