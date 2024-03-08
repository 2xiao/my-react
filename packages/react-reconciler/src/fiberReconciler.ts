import { Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './workTags';
import {
	UpdateQueue,
	creatUpdate,
	createUpdateQueue,
	enqueueUpdate
} from './updateQueue';
import { ReactElemenType } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';

export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	const root = new FiberRootNode(container, hostRootFiber);
	hostRootFiber.updateQueue = createUpdateQueue();
	return root;
}

export function updateContainer(
	element: ReactElemenType | null,
	root: FiberRootNode
) {
	const hostRootFiber = root.current;
	const update = creatUpdate<ReactElemenType | null>(element);
	enqueueUpdate(
		hostRootFiber.updateQueue as UpdateQueue<ReactElemenType | null>,
		update
	);
	scheduleUpdateOnFiber(hostRootFiber);
	return element;
}
