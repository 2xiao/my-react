import React from 'react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';

const jsx = (<div>
  <span>hello my-react</span>
</div>)

function App() {
  const [count, setCount] = useState(1210);
  return  <div onClick={() => setCount(count + 1)} >{count}</div>
}

function Child() {
  return <span>222</span>
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
// root.render(jsx);
root.render(<App />);

