import {
	FiberNode,
	FiberRootNode,
	PendingPassiveEffects,
	createWorkInProgress
} from './fiber';
import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { HostRoot } from './workTags';
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestory,
	commitHookEffectListUnmount,
	commitMutationEffects
} from './commitWork';
import {
	Lane,
	NoLane,
	SyncLane,
	getHighestPriorityLane,
	markRootFinished,
	mergeLanes
} from './fiberLanes';
import { flushSyncCallback, scheduleSyncCallback } from './syncTaskQueue';
import { scheduleMicroTask } from 'hostConfig';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority
} from 'scheduler';
import { HookHasEffect, Passive } from './hookEffectTags';

let workInProgress: FiberNode | null = null;
let workInProgressRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects: boolean = false;

// 调度功能
export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	const root = markUpdateFromFiberToRoot(fiber);
	markRootUpdated(root, lane);
	ensureRootIsScheduled(root);
}

// 从触发更新的节点向上遍历到 FiberRootNode
function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;
	while (parent !== null) {
		node = parent;
		parent = node.return;
	}
	if (node.tag == HostRoot) {
		return node.stateNode;
	}
	return null;
}

// 将更新的优先级(lane)记录到根节点上
function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

// Schedule 阶段入口
function ensureRootIsScheduled(root: FiberRootNode) {
	const updateLane = getHighestPriorityLane(root.pendingLanes);
	if (updateLane == NoLane) return;
	if (updateLane === SyncLane) {
		// 同步优先级，用微任务调度
		if (__DEV__) {
			console.log('在微任务中调度，优先级：', updateLane);
		}
		scheduleSyncCallback(renderRoot.bind(null, root, updateLane));
		scheduleMicroTask(flushSyncCallback);
	} else {
		// 其他优先级，用宏任务调度
	}
}

// Render 阶段入口
function renderRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriorityLane(root.pendingLanes);
	if (nextLane !== SyncLane) {
		// 其他比 SyncLane 低的优先级或 NoLane，重新调度
		ensureRootIsScheduled(root);
		return;
	}

	if (__DEV__) {
		console.warn('render 阶段开始');
	}

	// 初始化 workInProgress 变量
	prepareFreshStack(root, lane);
	do {
		try {
			// 深度优先遍历
			workLoop();
			break;
		} catch (e) {
			console.warn('workLoop发生错误：', e);
			workInProgress = null;
		}
	} while (true);

	if (workInProgress !== null) {
		console.error('render阶段结束时 workInProgress 不为 null');
	}

	// 创建根 Fiber 树的 Root Fiber
	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;
	root.finishedLane = lane;
	workInProgressRenderLane = NoLane;

	// 提交阶段的入口函数
	commitRoot(root);
}

// 初始化 workInProgress 变量
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	workInProgress = createWorkInProgress(root.current, {});
	workInProgressRenderLane = lane;
}

// 深度优先遍历，向下递归子节点
function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	// 比较并返回子 FiberNode
	const next = beginWork(fiber, workInProgressRenderLane);
	fiber.memoizedProps = fiber.pendingProps;

	if (next == null) {
		// 没有子节点，则遍历兄弟节点或父节点
		completeUnitOfWork(fiber);
	} else {
		// 有子节点，继续向下深度遍历
		workInProgress = next;
	}
}

// 深度优先遍历，向下递归子节点
function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;
	do {
		const next = completeWork(node) as FiberNode | null;
		if (next !== null) {
			workInProgress = next;
			return;
		}
		// 有兄弟节点，则遍历兄弟节点
		const sibling = node.sibling;
		if (sibling !== null) {
			workInProgress = sibling;
			return;
		}
		// 否则向上返回，遍历父节点
		node = node.return;
		workInProgress = node;
	} while (node !== null);
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;
	if (finishedWork === null) {
		return;
	}

	if (__DEV__) {
		console.warn('commit 阶段开始', finishedWork);
	}

	const lane = root.finishedLane;
	markRootFinished(root, lane);

	// 重置
	root.finishedWork = null;
	root.finishedLane = NoLane;

	const { flags, subtreeFlags } = finishedWork;

	// 判断 Fiber 树是否存在副作用
	if (
		(flags & PassiveMask) !== NoFlags ||
		(subtreeFlags & PassiveMask) !== NoFlags
	) {
		if (!rootDoesHasPassiveEffects) {
			rootDoesHasPassiveEffects = true;
			// 调度副作用
			// 回调函数在 setTimeout 中以 NormalPriority 优先级被调度执行
			scheduleCallback(NormalPriority, () => {
				// 执行副作用
				flushPassiveEffects(root.pendingPassiveEffects);
				return;
			});
		}
	}

	// 判断是否存在需要执行的 commit 操作
	if (
		(flags & MutationMask) !== NoFlags ||
		(subtreeFlags & MutationMask) !== NoFlags
	) {
		// TODO: BeforeMutation

		// Mutation
		commitMutationEffects(finishedWork, root);
		// Fiber 树切换，workInProgress 变成 current
		root.current = finishedWork;

		// TODO: Layout
	} else {
		root.current = finishedWork;
	}

	rootDoesHasPassiveEffects = false;
	ensureRootIsScheduled(root);
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	// 先触发所有 unmount destroy
	pendingPassiveEffects.unmount.forEach((effect) => {
		commitHookEffectListUnmount(Passive, effect);
	});
	pendingPassiveEffects.unmount = [];

	// 再触发所有上次更新的 destroy
	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListDestory(Passive | HookHasEffect, effect);
	});

	// 再触发所有这次更新的 create
	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});
	pendingPassiveEffects.update = [];

	// 执行 useEffect 过程中可能触发新的更新
	// 再次调用 flushSyncCallback 处理这些更新的更新流程
	flushSyncCallback();
}
