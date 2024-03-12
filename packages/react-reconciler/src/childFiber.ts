import { Props, ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	createFiberFromElement,
	createWorkInProgress
} from './fiber';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { HostText } from './workTags';
import { ChildDeletion, Placement } from './fiberFlags';

function ChildReconciler(shouldTrackSideEffects: boolean) {
	// 从父节点中删除指定的子节点
	function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode): void {
		if (!shouldTrackSideEffects) {
			return;
		}
		const deletions = returnFiber.deletions;
		if (deletions === null) {
			returnFiber.deletions = [childToDelete];
			returnFiber.flags |= ChildDeletion;
		} else {
			deletions.push(childToDelete);
		}
	}

	// 复用 Fiber 节点
	function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
		const clone = createWorkInProgress(fiber, pendingProps);
		clone.index = 0;
		clone.sibling = null;
		return clone;
	}

	// 处理单个 Fragment 节点的情况
	// 对比 currentFiber 与 ReactElement，生成 workInProgress FiberNode
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	) {
		// 组件的更新阶段
		if (currentFiber !== null) {
			if (currentFiber.key === element.key) {
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (currentFiber.type === element.type) {
						// key 和 type 都相同，复用旧的 Fiber 节点
						const existing = useFiber(currentFiber, element.props);
						existing.return = returnFiber;
						return existing;
					}
					// key 相同，但 type 不同，删除旧的 Fiber 节点
					deleteChild(returnFiber, currentFiber);
				} else {
					if (__DEV__) {
						console.warn('还未实现的 React 类型', element);
					}
				}
			} else {
				// key 不同，删除旧的 Fiber 节点
				deleteChild(returnFiber, currentFiber);
			}
		}
		// 创建新的 Fiber 节点
		const fiber = createFiberFromElement(element);
		fiber.return = returnFiber;
		return fiber;
	}

	// 处理文本节点的情况
	// 对比 currentFiber 与 ReactElement，生成 workInProgress FiberNode
	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: string | number
	) {
		if (currentFiber !== null) {
			// 组件的更新阶段
			if (currentFiber.tag === HostText) {
				// 复用旧的 Fiber 节点
				const existing = useFiber(currentFiber, { content });
				existing.return = returnFiber;
				return existing;
			} else {
				// 删除旧的 Fiber 节点
				deleteChild(returnFiber, currentFiber);
			}
		}
		// 创建新的 Fiber 节点
		const fiber = new FiberNode(HostText, { content }, null);
		fiber.return = returnFiber;
		return fiber;
	}

	// 为 Fiber 节点添加更新 flags
	function placeSingleChild(fiber: FiberNode) {
		// 首屏渲染且追踪副作用时，才添加更新 flags
		if (shouldTrackSideEffects && fiber.alternate == null) {
			fiber.flags |= Placement;
		}
		return fiber;
	}

	// 闭包，根绝 shouldTrackSideEffects 返回不同 reconcileChildFibers 的实现
	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: ReactElementType
	) {
		// 判断当前 fiber 的类型
		// 单个 Fragment 节点
		if (typeof newChild == 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFiber, newChild)
					);

				default:
					if (__DEV__) {
						console.warn('未实现的 reconcile 类型', newChild);
					}
					break;
			}
		}

		// 多个 Fragment 节点
		if (Array.isArray(newChild)) {
			// TODO: 暂时不处理
			if (__DEV__) {
				console.warn('未实现的 reconcile 类型，多个 Fragment 节点', newChild);
			}
		}

		// 文本节点
		if (typeof newChild == 'string' || typeof newChild == 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild)
			);
		}

		// default 情况，删除旧的 Fiber 节点
		if (currentFiber !== null) {
			deleteChild(returnFiber, currentFiber);
		}

		if (__DEV__) {
			console.warn('未实现的 reconcile 类型', newChild);
		}
		return null;
	};
}

// 组件的更新阶段中，追踪副作用
export const reconcileChildFibers = ChildReconciler(true);

// 首屏渲染阶段中不追踪副作用，只对根节点执行一次 DOM 插入操作
export const mountChildFibers = ChildReconciler(false);
