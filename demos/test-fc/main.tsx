import React from 'react';
import ReactDOM from 'react-dom/client';

const jsx = (<div>
  <span>hello my-react</span>
</div>)

function Child2() {
  return 1234
}
function App() {
  return <span>123</span>
}


const root = ReactDOM.createRoot(document.getElementById('root')!);
// root.render(jsx);
root.render(<App />);

