import { Container } from 'hostConfig';
import {
	unstable_ImmediatePriority,
	unstable_NormalPriority,
	unstable_UserBlockingPriority,
	unstable_runWithPriority
} from 'scheduler';
import { Props } from 'shared/ReactTypes';

// 支持的事件类型
const validEventTypeList = ['click'];

type EventCallback = (e: Event) => void;

interface Paths {
	capture: EventCallback[];
	bubble: EventCallback[];
}

interface SyntheticEvent extends Event {
	__stopPropagation: boolean;
}

export const elementPropsKey = '__props';

export interface DOMElement extends Element {
	[elementPropsKey]: Props;
}

// 将事件的回调保存在 DOM 中
export function updateFiberProps(node: DOMElement, props: Props) {
	node[elementPropsKey] = props;
}

export function initEvent(container: Container, eventType: string) {
	if (!validEventTypeList.includes(eventType)) {
		console.warn('initEvent 未实现的事件类型', eventType);
		return;
	}
	if (__DEV__) {
		console.log('初始化事件', eventType);
	}
	container.addEventListener(eventType, (e: Event) => {
		dispatchEvent(container, eventType, e);
	});
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
	const targetElement = e.target;
	if (targetElement == null) {
		console.warn('事件不存在targetElement', e);
		return;
	}
	// 收集沿途事件
	const { bubble, capture } = collectPaths(
		targetElement as DOMElement,
		container,
		eventType
	);

	// 构造合成事件
	const syntheticEvent = createSyntheticEvent(e);

	// 遍历捕获 capture
	triggerEventFlow(capture, syntheticEvent);

	// 遍历冒泡 bubble
	if (!syntheticEvent.__stopPropagation) {
		triggerEventFlow(bubble, syntheticEvent);
	}
}

function collectPaths(
	targetElement: DOMElement,
	container: Container,
	eventType: string
) {
	const paths: Paths = {
		capture: [],
		bubble: []
	};

	// 收集
	while (targetElement && targetElement !== container) {
		const elementProps = targetElement[elementPropsKey];
		if (elementProps) {
			const callbackNameList = getEventCallbackNameFromEventType(eventType);
			if (callbackNameList) {
				callbackNameList.forEach((callbackName, i) => {
					const callback = elementProps[callbackName];
					if (callback) {
						if (i == 0) {
							paths.capture.unshift(callback);
						} else {
							paths.bubble.push(callback);
						}
					}
				});
			}
		}
		targetElement = targetElement.parentNode as DOMElement;
	}

	return paths;
}

function getEventCallbackNameFromEventType(
	eventType: string
): string[] | undefined {
	return {
		click: ['onClickCapture', 'onClick']
	}[eventType];
}

function createSyntheticEvent(e: Event) {
	const syntheticEvent = e as SyntheticEvent;
	syntheticEvent.__stopPropagation = false;
	const originStopPropagation = e.stopPropagation;

	syntheticEvent.stopPropagation = () => {
		syntheticEvent.__stopPropagation = true;
		if (originStopPropagation) {
			originStopPropagation();
		}
	};

	return syntheticEvent;
}

function triggerEventFlow(
	paths: EventCallback[],
	syntheticEvent: SyntheticEvent
) {
	for (let i = 0; i < paths.length; i++) {
		const callback = paths[i];
		// 使用调度器，根据优先级执行 syntheticEvent
		unstable_runWithPriority(
			eventTypeToSchedulerPriority(syntheticEvent.type),
			() => {
				callback.call(null, syntheticEvent);
			}
		);

		if (syntheticEvent.__stopPropagation) {
			break;
		}
	}
}

function eventTypeToSchedulerPriority(eventType: string) {
	switch (eventType) {
		case 'click':
		case 'keydown':
		case 'keyup':
			return unstable_ImmediatePriority;
		case 'scroll':
			return unstable_UserBlockingPriority;
		default:
			return unstable_NormalPriority;
	}
}
