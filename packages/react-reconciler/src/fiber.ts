import { Props, Key, Ref, ReactElementType } from 'shared/ReactTypes';
import {
	FunctionComponent,
	HostComponent,
	Fragment,
	WorkTag
} from './workTags';
import { NoFlags, Flags } from './fiberFlags';
import { Container } from 'hostConfig';
import { Lane, Lanes, NoLane, NoLanes } from './fiberLanes';
import { Effect } from './fiberHooks';
import { CallbackNode } from 'scheduler';

export class FiberNode {
	tag: WorkTag;
	key: Key | null;
	stateNode: any;
	type: any;
	return: FiberNode | null;
	sibling: FiberNode | null;
	child: FiberNode | null;
	index: number;
	ref: Ref;
	pendingProps: Props;
	memoizedProps: Props | null;
	memoizedState: any;
	alternate: FiberNode | null;
	flags: Flags;
	deletions: Array<FiberNode> | null;
	subtreeFlags: Flags;
	updateQueue: unknown;

	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		// 类型
		this.tag = tag;
		this.key = key || null;
		this.ref = null;
		this.stateNode = null; // 节点对应的实际 DOM 节点或组件实例
		this.type = null; // 节点的类型，可以是原生 DOM 元素、函数组件或类组件等

		// 构成树状结构
		this.return = null; // 指向节点的父节点
		this.sibling = null; // 指向节点的下一个兄弟节点
		this.child = null; // 指向节点的第一个子节点
		this.index = 0; // 索引

		// 作为工作单元
		this.pendingProps = pendingProps; // 表示节点的新属性，用于在协调过程中进行更新
		this.memoizedProps = null; // 已经更新完的属性
		this.memoizedState = null; // 更新完成后新的 State
		this.updateQueue = null; // 更新计划队列
		this.alternate = null; // 指向节点的备份节点，用于在协调过程中进行比较
		this.flags = NoFlags; // 表示节点的副作用类型，如更新、插入、删除等
		this.subtreeFlags = NoFlags; // 表示子节点的副作用类型，如更新、插入、删除等
		this.deletions = null; // 指向待删除的子节点，用于在协调过程中进行删除
	}
}

export class FiberRootNode {
	container: Container;
	current: FiberNode;
	finishedWork: FiberNode | null;
	pendingLanes: Lanes;
	finishedLane: Lane;
	pendingPassiveEffects: PendingPassiveEffects;
	callbackNode: CallbackNode | null;
	callbackPriority: Lane;
	constructor(container: Container, hostRootFiber: FiberNode) {
		this.container = container;
		this.current = hostRootFiber;
		// 将根节点的 stateNode 属性指向 FiberRootNode，用于表示整个 React 应用的根节点
		hostRootFiber.stateNode = this;
		// 指向更新完成之后的 hostRootFiber
		this.finishedWork = null;
		this.pendingLanes = NoLanes;
		this.finishedLane = NoLane;
		this.pendingPassiveEffects = {
			unmount: [],
			update: []
		};
		this.callbackNode = null;
		this.callbackPriority = NoLane;
	}
}

export interface PendingPassiveEffects {
	unmount: Effect[];
	update: Effect[];
}

// 根据 FiberRootNode.current 创建 workInProgress
export const createWorkInProgress = (
	current: FiberNode,
	pendingProps: Props
): FiberNode => {
	let workInProgress = current.alternate;
	if (workInProgress == null) {
		// 首屏渲染时（mount）
		workInProgress = new FiberNode(current.tag, pendingProps, current.key);
		workInProgress.stateNode = current.stateNode;

		// 双缓冲机制
		workInProgress.alternate = current;
		current.alternate = workInProgress;
	} else {
		// 非首屏渲染时（update）
		workInProgress.pendingProps = pendingProps;
		// 将 effect 链表重置为空，以便在更新过程中记录新的副作用
		workInProgress.flags = NoFlags;
		workInProgress.subtreeFlags = NoFlags;
	}
	// 复制当前节点的大部分属性
	workInProgress.type = current.type;
	workInProgress.updateQueue = current.updateQueue;
	workInProgress.child = current.child;
	workInProgress.memoizedProps = current.memoizedProps;
	workInProgress.memoizedState = current.memoizedState;

	return workInProgress;
};

// 根据 DOM 节点创建新的 Fiber 节点
export function createFiberFromElement(element: ReactElementType): FiberNode {
	const { type, key, props } = element;
	let fiberTag: WorkTag = FunctionComponent;
	if (typeof type == 'string') {
		// 如: <div/> 的 type: 'div'
		fiberTag = HostComponent;
	} else if (typeof type !== 'function' && __DEV__) {
		console.warn('未定义的 type 类型', element);
	}

	const fiber = new FiberNode(fiberTag, props, key);
	fiber.type = type;
	return fiber;
}

export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
	const fiber = new FiberNode(Fragment, elements, key);
	return fiber;
}
