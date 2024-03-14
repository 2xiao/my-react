// 同步的任务队列
let syncQueue: ((...args: any) => void)[] | null = null;
let isFlushingSyncQueue: boolean = false;

// 调度同步的回调函数
export function scheduleSyncCallback(callback: (...args: any) => void) {
	if (syncQueue === null) {
		syncQueue = [callback];
	}
	syncQueue.push(callback);
}

// 遍历执行同步的回调函数
export function flushSyncCallback() {
	if (!isFlushingSyncQueue && syncQueue) {
		isFlushingSyncQueue = true;
		try {
			syncQueue.forEach((callback) => callback());
		} catch (e) {
			if (__DEV__) {
				console.error('flushSyncCallback 报错', e);
			}
		} finally {
			isFlushingSyncQueue = false;
			syncQueue = null;
		}
	}
}
