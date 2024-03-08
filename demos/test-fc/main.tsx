import React from 'react';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';

const jsx = (<div>
  <span>hello my-react</span>
</div>)

function App() {
  const [count, setCount] = useState(120);
  // window.setCount = setCount
  return <span>{count}</span>
}


const root = ReactDOM.createRoot(document.getElementById('root')!);
// root.render(jsx);
root.render(<App />);

