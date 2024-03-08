import * as React from 'react';

// 为了将 react-reconciler 和 react 解耦，在 shared 中转，方便 react-reconciler 使用
const internals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

export default internals;
