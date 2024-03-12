import { Action } from 'shared/ReactTypes';
import { Update } from './fiberFlags';
import { Dispatch } from 'react/src/currentDispatcher';

// 定义 Update 数据结构
export interface Update<State> {
	action: Action<State>;
}

// 定义 UpdateQueue 数据结构
export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}

// 创建 Update 实例的方法
export const createUpdate = <State>(action: Action<State>): Update<State> => {
	return {
		action
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
	updateQueue.shared.pending = update;
};

// 从 UpdateQueue 中消费 Update 的方法
export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null
): { memoizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState
	};
	if (pendingUpdate !== null) {
		const action = pendingUpdate.action;
		if (action instanceof Function) {
			// 若 action 是回调函数：(baseState = 1, update = (i) => 5i)) => memoizedState = 5
			result.memoizedState = action(baseState);
		} else {
			// 若 action 是状态值：(baseState = 1, update = 2) => memoizedState = 2
			result.memoizedState = action;
		}
	}
	return result;
};
