import {
	Container,
	Instance,
	appendChildToContainer,
	commitUpdate,
	insertChildToContainer,
	removeChild
} from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import {
	ChildDeletion,
	MutationMask,
	NoFlags,
	Placement,
	Update
} from './fiberFlags';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';

let nextEffect: FiberNode | null = null;

export const commitMutationEffects = (finishedWork: FiberNode) => {
	nextEffect = finishedWork;

	// 深度优先遍历 Fiber 树，寻找更新 flags
	while (nextEffect !== null) {
		// 向下遍历
		const child: FiberNode | null = nextEffect.child;
		if (
			(nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			// 子节点存在 mutation 阶段需要执行的 flags
			nextEffect = child;
		} else {
			// 子节点不存在 mutation 阶段需要执行的 flags 或没有子节点
			// 向上遍历
			up: while (nextEffect !== null) {
				// 处理 flags
				commitMutationEffectsOnFiber(nextEffect);

				const sibling: FiberNode | null = nextEffect.sibling;
				// 遍历兄弟节点
				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}
				// 遍历父节点
				nextEffect = nextEffect.return;
			}
		}
	}
};

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	const flags = finishedWork.flags;
	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork);
		// 处理完之后，从 flags 中删除 Placement 标记
		finishedWork.flags &= ~Placement;
	}
	if ((flags & ChildDeletion) !== NoFlags) {
		const deletions = finishedWork.deletions;
		if (deletions !== null) {
			deletions.forEach((childToDelete) => {
				commitDeletion(childToDelete);
			});
		}
		finishedWork.flags &= ~ChildDeletion;
	}
	if ((flags & Update) !== NoFlags) {
		commitUpdate(finishedWork);
		finishedWork.flags &= ~Update;
	}
};

// 执行 DOM 插入操作，将 FiberNode 对应的 DOM 插入 parent DOM 中
const commitPlacement = (finishedWork: FiberNode) => {
	if (__DEV__) {
		console.log('执行 Placement 操作', finishedWork);
	}
	// parent DOM
	const hostParent = getHostParent(finishedWork) as Container;

	// Host sibling
	const sibling = getHostSibling(finishedWork);

	appendPlacementNodeIntoContainer(finishedWork, hostParent, sibling);
};

// 获取兄弟 Host 节点
const getHostSibling = (fiber: FiberNode) => {
	let node: FiberNode = fiber;
	findSibling: while (true) {
		// 没有兄弟节点时，向上遍历
		while (node.sibling == null) {
			const parent = node.return;
			if (
				parent == null ||
				parent.tag == HostComponent ||
				parent.tag == HostRoot
			) {
				return null;
			}
			node = parent;
		}

		// 向下遍历
		node.sibling.return = node.return;
		node = node.sibling;
		while (node.tag !== HostText && node.tag !== HostComponent) {
			// 不稳定的 Host 节点不能作为目标兄弟 Host 节点
			if ((node.flags & Placement) !== NoFlags) {
				continue findSibling;
			}
			if (node.child == null) {
				continue findSibling;
			} else {
				node.child.return = node;
				node = node.child;
			}
		}

		if ((node.flags & Placement) == NoFlags) {
			return node.stateNode;
		}
	}
};

// 获取 parent DOM
const getHostParent = (fiber: FiberNode) => {
	let parent = fiber.return;
	while (parent !== null) {
		const parentTag = parent.tag;
		if (parentTag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}
		if (parentTag === HostComponent) {
			return parent.stateNode as Container;
		}
		parent = parent.return;
	}
	if (__DEV__) {
		console.warn('未找到 host parent', fiber);
	}
};

const appendPlacementNodeIntoContainer = (
	finishedWork: FiberNode,
	hostParent: Container,
	before?: Instance
) => {
	if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
		if (before) {
			// 执行移动操作
			insertChildToContainer(finishedWork.stateNode, hostParent, before);
		} else {
			// 执行插入操作
			appendChildToContainer(finishedWork.stateNode, hostParent);
		}
	} else {
		const child = finishedWork.child;
		if (child !== null) {
			appendPlacementNodeIntoContainer(child, hostParent);
			let sibling = child.sibling;
			while (sibling !== null) {
				appendPlacementNodeIntoContainer(sibling, hostParent);
				sibling = sibling.sibling;
			}
		}
	}
};

// 删除节点及其子树
const commitDeletion = (childToDelete: FiberNode) => {
	if (__DEV__) {
		console.log('执行 Deletion 操作', childToDelete);
	}

	// 子树的根节点
	let rootHostNode: FiberNode | null = null;

	// 递归遍历子树
	commitNestedUnmounts(childToDelete, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				if (rootHostNode === null) {
					rootHostNode = unmountFiber;
				}
				// TODO 解绑ref
				return;
			case HostText:
				if (rootHostNode === null) {
					rootHostNode = unmountFiber;
				}
				return;
			case FunctionComponent:
				//  TODO useEffect unmount
				return;
			default:
				if (__DEV__) {
					console.warn('未实现的 delete 类型', unmountFiber);
				}
		}
	});

	// 移除 rootHostNode 的DOM
	if (rootHostNode !== null) {
		// 找到待删除子树的根节点的 parent DOM
		const hostParent = getHostParent(childToDelete) as Container;
		removeChild((rootHostNode as FiberNode).stateNode, hostParent);
	}

	childToDelete.return = null;
	childToDelete.child = null;
};

// 深度优先遍历 Fiber 树，执行 onCommitUnmount
const commitNestedUnmounts = (
	root: FiberNode,
	onCommitUnmount: (unmountFiber: FiberNode) => void
) => {
	let node = root;
	while (true) {
		onCommitUnmount(node);

		// 向下遍历，递
		if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}
		// 终止条件
		if (node === root) return;

		// 向上遍历，归
		while (node.sibling === null) {
			// 终止条件
			if (node.return == null || node.return == root) return;
			node = node.return;
		}
		node.sibling.return = node.return;
		node = node.sibling;
	}
};
