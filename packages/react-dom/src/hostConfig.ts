import { FiberNode } from 'react-reconciler/src/fiber';
import { HostComponent, HostText } from 'react-reconciler/src/workTags';

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

export const createInstance = (type: string, porps: any): Instance => {
	// TODO: 处理 props
	const element = document.createElement(type);
	return element;
};

export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance
) => {
	parent.appendChild(child);
};

export const createTextInstance = (content: string) => {
	const element = document.createTextNode(content);
	return element;
};

export const appendChildToContainer = (
	child: Instance,
	parent: Instance | Container
) => {
	parent.appendChild(child);
};

export const commitUpdate = (fiber: FiberNode) => {
	if (__DEV__) {
		console.log('执行 Update 操作', fiber);
	}
	switch (fiber.tag) {
		case HostComponent:
			// TODO
			break;
		case HostText:
			const text = fiber.memoizedProps.content;
			commitTextUpdate(fiber.stateNode, text);
			break;
		default:
			if (__DEV__) {
				console.warn('未实现的 commitUpdate 类型', fiber);
			}
	}
};

export const commitTextUpdate = (
	textInstance: TextInstance,
	content: string
) => {
	textInstance.textContent = content;
};

export const removeChild = (
	child: Instance | TextInstance,
	container: Container
) => {
	container.removeChild(child);
};
