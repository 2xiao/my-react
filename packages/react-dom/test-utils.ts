import { ReactElementType } from 'shared/ReactTypes';
import { createRoot } from 'react-dom/client';

export function renderIntoDocument(element: ReactElementType) {
	const div = document.createElement('div');
	return createRoot(div).render(element);
}
