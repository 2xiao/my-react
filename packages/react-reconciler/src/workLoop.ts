import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber';
import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { HostRoot } from './workTags';
import { MutationMask, NoFlags } from './fiberFlags';
import { commitMutationEffects } from './commitWork';

let workInProgress: FiberNode | null = null;

// 调度功能
export function scheduleUpdateOnFiber(fiber: FiberNode) {
	const root = markUpdateFromFiberToRoot(fiber);
	renderRoot(root);
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

function renderRoot(root: FiberRootNode) {
	// 初始化 workInProgress 变量
	prepareFreshStack(root);
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

	// 提交阶段的入口函数
	commitRoot(root);
}

// 初始化 workInProgress 变量
function prepareFreshStack(root: FiberRootNode) {
	workInProgress = createWorkInProgress(root.current, {});
}

// 深度优先遍历，向下递归子节点
function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	// 比较并返回子 FiberNode
	const next = beginWork(fiber);
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
		console.log('commit 阶段开始');
	}

	// 重置
	root.finishedWork = null;

	// 判断是否存在 3 个子阶段需要执行的操作
	const subtreeHasEffects =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;
	const rootHasEffects = (finishedWork.flags & MutationMask) !== NoFlags;

	if (subtreeHasEffects || rootHasEffects) {
		// TODO: BeforeMutation

		// Mutation
		commitMutationEffects(finishedWork);
		// Fiber 树切换，workInProgress 变成 current
		root.current = finishedWork;

		// TODO: Layout
	} else {
		root.current = finishedWork;
	}
}
