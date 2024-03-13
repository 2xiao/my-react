const supportSymbol = typeof Symbol === 'function' && Symbol.for;

// ReactElement.type 属性

// 表示普通的 React 元素，即通过 JSX 创建的组件或 DOM 元素
export const REACT_ELEMENT_TYPE = supportSymbol
	? Symbol.for('react.element')
	: 0xeac7;

// 表示 Fragment 组件，即 <React.Fragment> 或短语法 <></> 创建的 Fragment
export const REACT_FRAGMENT_TYPE = supportSymbol
	? Symbol.for('react.fragment')
	: 0xeacb;
