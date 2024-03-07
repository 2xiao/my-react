import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler';
import { Container } from './hostConfig';
import { ReactElemenType } from 'shared/ReactTypes';

// ReactDOM.createRoot(root).render(<App />);
export function createRoot(container: Container) {
	const root = createContainer(container);
	return {
		render(element: ReactElemenType) {
			updateContainer(element, root);
		}
	};
}
