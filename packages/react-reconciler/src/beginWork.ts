import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { UpdateQueue, processUpdateQueue } from './updateQueue';
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';
import { reconcileChildFibers, mountChildFibers } from './childFiber';
import { renderWithHooks } from './fiberHooks';

// 比较并返回子 FiberNode
export const beginWork = (workInProgress: FiberNode) => {
	switch (workInProgress.tag) {
		case HostRoot:
			return updateHostRoot(workInProgress);
		case HostComponent:
			return updateHostComponent(workInProgress);
		case FunctionComponent:
			return updateFunctionComponent(workInProgress);
		case HostText:
			return updateHostText();
		case Fragment:
			return updateFragment(workInProgress);
		default:
			if (__DEV__) {
				console.warn('beginWork 未实现的类型', workInProgress.tag);
			}
			break;
	}
};

function updateHostRoot(workInProgress: FiberNode) {
	// 根据当前节点和工作中节点的状态进行比较，处理属性等更新逻辑
	const baseState = workInProgress.memoizedState;
	const updateQueue = workInProgress.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	// 清空更新链表
	updateQueue.shared.pending = null;
	// 计算待更新状态的最新值
	const { memoizedState } = processUpdateQueue(baseState, pending);
	workInProgress.memoizedState = memoizedState;

	// 处理子节点的更新逻辑
	const nextChildren = workInProgress.memoizedState;
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

function updateFunctionComponent(workInProgress: FiberNode) {
	const nextChildren = renderWithHooks(workInProgress);
	reconcileChildren(workInProgress, nextChildren);
	return workInProgress.child;
}

function updateHostText() {
	// 没有子节点，直接返回 null
	return null;
}

function updateFragment(workInProgress: FiberNode) {
	const nextChildren = workInProgress.pendingProps;
	reconcileChildren(workInProgress, nextChildren);
	return workInProgress.child;
}

// 对比子节点的 current FiberNode 与 子节点的 ReactElement
// 生成子节点对应的 workInProgress FiberNode
function reconcileChildren(
	workInProgress: FiberNode,
	children?: ReactElementType
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
