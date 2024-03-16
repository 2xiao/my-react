import internals from 'shared/internals';
import { FiberNode } from './fiber';
import {
	UpdateQueue,
	createUpdate,
	enqueueUpdate,
	processUpdateQueue
} from './updateQueue';
import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { createUpdateQueue } from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { Lane, NoLane, requestUpdateLanes } from './fiberLanes';
import { EffectTags, HookHasEffect, Passive } from './hookEffectTags';
import { PassiveEffect } from './fiberFlags';

// 当前正在被处理的 FiberNode
let currentlyRenderingFiber: FiberNode | null = null;
// Hooks 链表中当前正在工作的 Hook
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;

const { currentDispatcher } = internals;

// 定义 Hook 数据结构
export interface Hook {
	memoizedState: any; // 保存 Hook 的数据
	queue: any;
	next: Hook | null;
}

export interface Effect {
	tag: EffectTags;
	create: EffectCallback | void;
	destroy: EffectCallback | void;
	deps: EffectDeps;
	next: Effect | null;
}

type EffectCallback = () => void;
type EffectDeps = any[] | null;

// 定义函数组件的 FCUpdateQueue 数据结构
export interface FCUpdateQueue<State> extends UpdateQueue<State> {
	lastEffect: Effect | null;
}

// 执行函数组件中的函数
export function renderWithHooks(workInProgress: FiberNode, lane: Lane) {
	// 赋值
	currentlyRenderingFiber = workInProgress;
	renderLane = lane;

	// 重置 Hooks 链表
	workInProgress.memoizedState = null;
	// 重置 Effect 链表
	workInProgress.updateQueue = null;

	// 判断 Hooks 被调用的时机
	const current = workInProgress.alternate;
	if (__DEV__) {
		console.warn(current !== null ? '组件的更新阶段' : '首屏渲染阶段');
	}
	if (current !== null) {
		// 组件的更新阶段(update)
		currentDispatcher.current = HooksDispatcherOnUpdate;
	} else {
		// 首屏渲染阶段(mount)
		currentDispatcher.current = HooksDispatcherOnMount;
	}

	// 函数保存在 type 字段中
	const Component = workInProgress.type;
	const props = workInProgress.pendingProps;
	// 执行函数
	const children = Component(props);

	// 重置
	currentlyRenderingFiber = null;
	workInProgressHook = null;
	currentHook = null;
	renderLane = NoLane;

	return children;
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState,
	useEffect: mountEffect
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect
};

function mountState<State>(
	initialState: (() => State) | State
): [State, Dispatch<State>] {
	if (__DEV__) {
		console.warn('调用 mountState 方法');
	}

	// 当前正在工作的 useState
	const hook = mountWorkInProgressHook();
	// 获取当前 useState 对应的 Hook 数据
	let memoizedState;
	if (initialState instanceof Function) {
		memoizedState = initialState();
	} else {
		memoizedState = initialState;
	}
	hook.memoizedState = memoizedState;

	const queue = createUpdateQueue<State>();
	hook.queue = queue;

	// @ts-ignore
	// 实现 dispatch
	const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
	queue.dispatch = dispatch;

	return [memoizedState, dispatch];
}

function updateState<State>(): [State, Dispatch<State>] {
	if (__DEV__) {
		console.warn('调用 updateState 方法');
	}
	// 当前正在工作的 useState
	const hook = updateWorkInProgressHook();

	// 计算新 state 的逻辑
	const queue = hook.queue as UpdateQueue<State>;
	const pending = queue.shared.pending;
	queue.shared.pending = null;

	if (pending !== null) {
		const { memoizedState } = processUpdateQueue(
			hook.memoizedState,
			pending,
			renderLane
		);
		hook.memoizedState = memoizedState;
	}
	return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	// 当前正在工作的 useEffect
	const hook = mountWorkInProgressHook();
	const nextDeps = deps == undefined ? null : deps;

	(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
	hook.memoizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		nextDeps
	);
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	// 当前正在工作的 useEffect
	const hook = updateWorkInProgressHook();
	const nextDeps = deps == undefined ? null : (deps as EffectDeps);
	let destroy: EffectCallback | void;

	if (currentHook !== null) {
		const prevEffect = currentHook.memoizedState as Effect;
		destroy = prevEffect.destroy;
		if (nextDeps !== null) {
			// 浅比较依赖
			const prevDeps = prevEffect.deps;
			// 浅比较，相等
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps);
				return;
			}
			// 浅比较，不相等
			(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
			hook.memoizedState = pushEffect(
				Passive | HookHasEffect,
				create,
				destroy,
				nextDeps
			);
		}
	}
}

function areHookInputsEqual(
	nextDeps: EffectDeps,
	prevDeps: EffectDeps
): boolean {
	if (nextDeps === null || prevDeps === null) return false;
	for (let i = 0; i < nextDeps.length && i < prevDeps.length; i++) {
		if (Object.is(nextDeps[i], prevDeps[i])) {
			continue;
		}
		return false;
	}
	return true;
}

function pushEffect(
	tag: EffectTags,
	create: EffectCallback | void,
	destroy: EffectCallback | void,
	deps: EffectDeps
): Effect {
	const effect: Effect = {
		tag,
		create,
		destroy,
		deps,
		next: null
	};
	const fiber = currentlyRenderingFiber as FiberNode;
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
	if (updateQueue === null) {
		const newUpdateQueue = creactFCUpdateQueue();
		effect.next = effect;
		newUpdateQueue.lastEffect = effect;
		fiber.updateQueue = newUpdateQueue;
	} else {
		const lastEffect = updateQueue.lastEffect;
		if (lastEffect == null) {
			effect.next = effect;
			updateQueue.lastEffect = effect;
		} else {
			const firstEffect = lastEffect.next;
			lastEffect.next = effect;
			effect.next = firstEffect;
			updateQueue.lastEffect = effect;
		}
	}
	return effect;
}

function creactFCUpdateQueue<State>() {
	const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
	updateQueue.lastEffect = null;
	return updateQueue;
}

function updateWorkInProgressHook(): Hook {
	// TODO render 阶段触发的更新
	// 保存链表中的下一个 Hook
	let nextCurrentHook: Hook | null;
	if (currentHook == null) {
		// 这是函数组件 update 时的第一个 hook
		const current = (currentlyRenderingFiber as FiberNode).alternate;
		if (current === null) {
			nextCurrentHook = null;
		} else {
			nextCurrentHook = current.memoizedState;
		}
	} else {
		// 这是函数组件 update 时后续的 hook
		nextCurrentHook = currentHook.next;
	}

	if (nextCurrentHook == null) {
		throw new Error(
			`组件 ${currentlyRenderingFiber?.type} 本次执行时的 Hooks 比上次执行多`
		);
	}

	currentHook = nextCurrentHook as Hook;
	const newHook: Hook = {
		memoizedState: currentHook.memoizedState,
		queue: currentHook.queue,
		next: null
	};
	if (workInProgressHook == null) {
		// update 时的第一个hook
		if (currentlyRenderingFiber !== null) {
			workInProgressHook = newHook;
			currentlyRenderingFiber.memoizedState = workInProgressHook;
		} else {
			// currentlyRenderingFiber == null 代表 Hook 执行的上下文不是一个函数组件
			throw new Error('Hooks 只能在函数组件中执行');
		}
	} else {
		// update 时的其他 hook
		// 将当前处理的 Hook.next 指向新建的 hook，形成 Hooks 链表
		workInProgressHook.next = newHook;
		// 更新当前处理的 Hook
		workInProgressHook = newHook;
	}
	return workInProgressHook;
}

function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		queue: null,
		next: null
	};
	if (workInProgressHook == null) {
		// mount 时的第一个hook
		if (currentlyRenderingFiber !== null) {
			workInProgressHook = hook;
			currentlyRenderingFiber.memoizedState = workInProgressHook;
		} else {
			// currentlyRenderingFiber == null 代表 Hook 执行的上下文不是一个函数组件
			throw new Error('Hooks 只能在函数组件中执行');
		}
	} else {
		// mount 时的其他 hook
		// 将当前处理的 Hook.next 指向新建的 hook，形成 Hooks 链表
		workInProgressHook.next = hook;
		// 更新当前处理的 Hook
		workInProgressHook = hook;
	}
	return workInProgressHook;
}

// 用于触发状态更新的逻辑
function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>
) {
	const lane = requestUpdateLanes();
	const update = createUpdate(action, lane);
	enqueueUpdate(updateQueue, update);
	// 调度更新
	scheduleUpdateOnFiber(fiber, lane);
}
