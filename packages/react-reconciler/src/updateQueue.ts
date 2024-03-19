import { Action } from 'shared/ReactTypes';
import { Update } from './fiberFlags';
import { Dispatch } from 'react/src/currentDispatcher';
import { Lane, NoLane, isSubsetOfLanes } from './fiberLanes';

// 定义 Update 数据结构
export interface Update<State> {
	action: Action<State>;
	next: Update<any> | null;
	lane: Lane;
}

// 定义 UpdateQueue 数据结构
export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}

// 创建 Update 实例的方法
export const createUpdate = <State>(
	action: Action<State>,
	lane: Lane
): Update<State> => {
	return {
		action,
		next: null,
		lane
	};
};

// 创建 UpdateQueue 实例的方法
export const createUpdateQueue = <State>(): UpdateQueue<State> => {
	return {
		shared: {
			pending: null
		},
		dispatch: null
	};
};

// 将 Update 添加到 UpdateQueue 中的方法
export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) => {
	const pending = updateQueue.shared.pending;
	if (pending === null) {
		update.next = update;
	} else {
		update.next = pending.next;
		pending.next = update;
	}
	// pending 指向 update 环状链表的最后一个节点
	updateQueue.shared.pending = update;
};

// 从 UpdateQueue 中消费 Update 的方法
export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane
): {
	memoizedState: State;
	baseState: State;
	baseQueue: Update<State> | null;
} => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState,
		baseState,
		baseQueue: null
	};
	if (pendingUpdate !== null) {
		// 第一个 update
		const first = pendingUpdate.next;
		let pending = first as Update<any>;

		let newBaseState = baseState; // 消费本次 Update 后的 baseState
		let newState = baseState; // 消费本次 Update 后计算后的结果
		let newBaseQueueFirst: Update<State> | null = null; // 消费本次 Update 后的 baseQueue 链表头
		let newBaseQueueLast: Update<State> | null = null; // 消费本次 Update 后的 baseQueue 链表尾

		do {
			const updateLane = pending.lane;
			if (!isSubsetOfLanes(renderLane, updateLane)) {
				// 优先级不够，跳过本次 Update
				const clone = createUpdate(pending.action, pending.lane);
				// 判断之前是否存在被跳过的 Update
				if (newBaseQueueLast === null) {
					newBaseQueueFirst = clone;
					// 若有更新被跳过，baseState 为最后一个没有被跳过的 Update 计算后的结果
					newBaseState = newState;
				} else {
					// 本次更新第一个被跳过的 Update 及其后面的所有 Update 都会被保存在 baseQueue 中参与下次 State 计算
					newBaseQueueLast.next = clone;
				}
				newBaseQueueLast = clone;
			} else {
				// 优先级足够
				// 判断之前是否存在被跳过的 Update
				if (newBaseQueueLast !== null) {
					// 本次更新参与计算但保存在 baseQueue 中的 Update，优先级会降低到 NoLane
					const clone = createUpdate(pending.action, NoLane);
					newBaseQueueLast.next = clone;
					newBaseQueueLast = clone;
				}

				const action = pending.action;
				if (action instanceof Function) {
					// 若 action 是回调函数：(baseState = 1, update = (i) => 5i)) => memoizedState = 5
					newState = action(baseState);
				} else {
					// 若 action 是状态值：(baseState = 1, update = 2) => memoizedState = 2
					newState = action;
				}
			}
			pending = pending.next as Update<any>;
		} while (pending !== first);

		if (newBaseQueueLast === null) {
			// 本次更新没有 Update 被跳过
			newBaseState = newState;
		} else {
			// 本次更新有 Update 被跳过
			// 将 baseQueue 变成环状链表
			newBaseQueueLast.next = newBaseQueueFirst;
		}
		result.memoizedState = newState;
		result.baseState = newBaseState;
		result.baseQueue = newBaseQueueFirst;
	}

	return result;
};
