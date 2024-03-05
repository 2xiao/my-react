import {Props, Key, Ref} from 'shared/ReactTypes'
import { WorkTag } from './workTags'
import { NoFlags, EffectTags } from './effectTags';

export class FiberNode {
    tag: WorkTag;
    key: Key;
    stateNode: any;
    type: any;
    return: FiberNode | null;
    sibling: FiberNode | null;
    child: FiberNode | null;
    index: number;
    ref: Ref;
    pendingProps: Props;
    memorizedPros: Props | null;
    alternate: FiberNode | null;
    flag: EffectTags;

    constructor (tag: WorkTag, pendingProps:Props, key:Key) {
        // 类型
        this.tag = tag;
        this.key = key;
        this.ref = null;
        this.stateNode = null; // 节点对应的实际 DOM 节点或组件实例
        this.type = null; // 节点的类型，可以是原生 DOM 元素、函数组件或类组件等

        // 构成树状结构
        this.return = null; // 指向节点的父节点
        this.sibling = null; // 指向节点的下一个兄弟节点
        this.child = null; // 指向节点的第一个子节点
        this.index = 0// 索引

        // 作为工作单元
        this.pendingProps = pendingProps; // 表示节点的新属性，用于在协调过程中进行更新
        this.memorizedPros = null; // 已经更新完的属性
        this.alternate = null; // 指向节点的备份节点，用于在协调过程中进行比较
        this.flag = NoFlags; // 表示节点的副作用类型，如更新、插入、删除等
    }
}