import React from 'react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';

const jsx = (
	<div>
		<span>hello my-react</span>
	</div>
);

function App() {
	const [count, setCount] = useState(1210);
	const arr =
		count % 2 === 0
			? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
			: [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>];
	return (
		<ul onClickCapture={() => setCount(count + 1)}>
			{arr}
			<li>4</li>
			<li>5</li>
		</ul>
	);
	return (
		<ul>
			<>
				<li>1</li>
				<li>2</li>
			</>
			<li>3</li>
			<li>4</li>
		</ul>
	);
	return (
		<>
			<div>1</div>
			<div>2</div>
		</>
	);
	return <ul onClick={() => setCount(count + 1)}>{arr}</ul>;
}

function Child() {
	return <span>222</span>;
}

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement
);
// root.render(jsx);
root.render(<App />);
