/* eslint-disable @typescript-eslint/no-explicit-any */
export type Type = any;
export type Key = any;
export type Props = any;
export type Ref = any;
export type ElementType = any;

export interface ReactElemenType {
	$$typeof: symbol | number;
	key: Key;
	props: Props;
	ref: Ref;
	type: ElementType;
	__mark: string;
}
