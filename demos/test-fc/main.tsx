import React from 'react';
import ReactNoop from 'react-noop-renderer';

const jsx = (
	<div>
		<span>hello my-react</span>
	</div>
);

function App() {
	return (<div>
			<Child/>
			<div>hello world</div>
		</div>
	);
}

function Child() {
	return 'I am child';
}

const root = ReactNoop.createRoot();
root.render(<App />);

// root.render(jsx);

window.root = root;