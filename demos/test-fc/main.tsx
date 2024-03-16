import React from 'react';
import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

const jsx = (
	<div>
		<span>hello my-react</span>
	</div>
);

function App() {
	const [count, setCount] = useState(0);
	useEffect(() => {
		console.log('app mount')
	}, [])

	useEffect(() => {
		console.log('count change create', count)
		return () => {
            console.log('count change destroy', count)
        }
	}, [count])
	return (
		<div onClick={() => setCount(count => count + 1)}>
			{count === 0 ? <Child/> : 'noop'}
		</div>
	);
}

function Child() {
	useEffect(() => {
		console.log('child mount')
		return () => {
            console.log('child destroy')
        }
	}, [])
	return <span>I am child</span>;
}

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement
);
// root.render(jsx);
root.render(<App />);
