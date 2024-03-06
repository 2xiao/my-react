import { FiberNode, FiberRootNode, createWorkInProgress } from './fiber';
import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { HostRoot } from './workTags';

let workInProgress: FiberNode | null = null;

// 调度功能
export function scheduleUpdateOnFiber(fiber: FiberNode) {
	const root = markUpdateFromFiberToRoot(fiber)
	renderRoot(root)
}

// 从触发更新的节点向上遍历到 FiberRootNode
function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber
	while(node.return !== null) {
		node = node.return
	}
	if (node.tag == HostRoot) {
		return node.stateNode
	}
	return null
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
	fiber.memorizedPros = fiber.pendingProps;

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
		completeWork(node);
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
