import { ReactElemenType } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { UpdateQueue, processUpdateQueue } from './updateQueue';
import { HostComponent, HostRoot, HostText } from './workTags';
import { reconcileChildFibers, mountChildFibers } from './childFiber';

// 比较并返回子 FiberNode
export const beginWork = (workInProgress: FiberNode) => {
	switch (workInProgress.tag) {
		case HostRoot:
			return updateHostRoot(workInProgress);
		case HostComponent:
			return updateHostComponent(workInProgress);
		case HostText:
			return updateHostText();
		default:
			if (__DEV__) {
				console.warn('beginWork 未实现的类型', workInProgress.tag);
			}
			break;
	}
};

function updateHostRoot(workInProgress: FiberNode) {
	// 根据当前节点和工作中节点的状态进行比较，处理属性等更新逻辑
	const baseState = workInProgress.memorizedState;
	const updateQueue = workInProgress.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	// 清空更新链表
	updateQueue.shared.pending = null;
	// 计算待更新状态的最新值
	const { memorizedState } = processUpdateQueue(baseState, pending);
	workInProgress.memorizedState = memorizedState;

	// 处理子节点的更新逻辑
	const nextChildren = workInProgress.memorizedState;
	reconcileChildren(workInProgress, nextChildren);

	// 返回新的子节点
	return workInProgress.child;
}

function updateHostComponent(workInProgress: FiberNode) {
	const nextProps = workInProgress.pendingProps;
	const nextChildren = nextProps.children;
	reconcileChildren(workInProgress, nextChildren);
	return workInProgress.child;
}

function updateHostText() {
	// 没有子节点，直接返回 null
	return null;
}

// 对比子节点的 current FiberNode 与 子节点的 ReactElement
// 生成子节点对应的 workInProgress FiberNode
function reconcileChildren(
	workInProgress: FiberNode,
	children?: ReactElemenType
) {
	// alternate 指向节点的备份节点，即 current
	const current = workInProgress.alternate;
	if (current !== null) {
		// 组件的更新阶段
		workInProgress.child = reconcileChildFibers(
			workInProgress,
			current?.child,
			children
		);
	} else {
		// 首屏渲染阶段
		workInProgress.child = mountChildFibers(workInProgress, null, children);
	}
}