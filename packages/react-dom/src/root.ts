import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler';
import { Container } from './hostConfig';
import { ReactElementType } from 'shared/ReactTypes';

// ReactDOM.createRoot(root).render(<App />);
export function createRoot(container: Container) {
	const root = createContainer(container);

	return {
		render(element: ReactElementType) {
			return updateContainer(element, root);
		}
	};
}
